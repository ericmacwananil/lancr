const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Contract = require("../models/Contract");

// @desc    Get or create conversation for a contract
// @route   POST /api/conversations/contract/:contractId
// @access  Private
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId)
    .populate("client")
    .populate("freelancer");

  if (!contract) {
    res.status(404);
    throw new Error("Contract not found");
  }

  // Check if user is part of this contract
  if (
    contract.client._id.toString() !== req.user._id.toString() &&
    contract.freelancer._id.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Not authorized to access this conversation");
  }

  // Find or create conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [contract.client._id, contract.freelancer._id] },
    contract: contract._id,
  })
    .populate("participants", "name avatar")
    .populate("lastMessage");

  if (!conversation) {
    // Initialize unread counts to 0 for both users
    const initialUnreadCounts = {};
    initialUnreadCounts[contract.client._id.toString()] = 0;
    initialUnreadCounts[contract.freelancer._id.toString()] = 0;
    conversation = await Conversation.create({
      participants: [contract.client._id, contract.freelancer._id],
      contract: contract._id,
      unreadCounts: initialUnreadCounts,
    });
    await conversation.populate("participants", "name avatar");
    await conversation.populate("lastMessage");
  }

  // Convert unreadCounts Map to plain object for frontend
  const convObj = conversation.toObject();
  convObj.unreadCounts = Object.fromEntries(conversation.unreadCounts || new Map());
  res.status(200).json({ success: true, conversation: convObj });
});

// @desc    Get all conversations for current user
// @route   GET /api/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  let conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate("participants", "name avatar")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

  // Convert unreadCounts Map to plain object for frontend
  conversations = conversations.map(conv => {
    const convObj = conv.toObject();
    convObj.unreadCounts = Object.fromEntries(conv.unreadCounts || new Map());
    return convObj;
  });

  res.status(200).json({ success: true, conversations });
});

// @desc    Get messages for a conversation
// @route   GET /api/conversations/:conversationId/messages
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error("Not authorized to access this conversation");
  }

  const messages = await Message.find({
    conversation: req.params.conversationId,
  })
    .populate("sender", "name avatar")
    .sort({ createdAt: 1 });

  // Mark messages as read for this user
  await Message.updateMany(
    { conversation: req.params.conversationId, sender: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  // Reset unread count for this user
  conversation.unreadCounts.set(req.user._id.toString(), 0);
  await conversation.save();

  res.status(200).json({ success: true, messages });
});

// @desc    Send a message
// @route   POST /api/conversations/:conversationId/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim() === "") {
    res.status(400);
    throw new Error("Message content is required");
  }

  let conversation = await Conversation.findById(
    req.params.conversationId
  ).populate("participants");

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error("Not authorized to send message in this conversation");
  }

  const message = await Message.create({
    conversation: req.params.conversationId,
    sender: req.user._id,
    content: content.trim(),
    readBy: [req.user._id],
  });

  await message.populate("sender", "name avatar");

  // Update last message on conversation
  conversation.lastMessage = message._id;

  // Increment unread count for the recipient
  const recipientId = conversation.participants.find(
    (p) => p._id.toString() !== req.user._id.toString()
  )?._id.toString();
  
  if (recipientId) {
    const currentUnread = conversation.unreadCounts.get(recipientId) || 0;
    conversation.unreadCounts.set(recipientId, currentUnread + 1);
  }
  
  await conversation.save();

  // Repopulate conversation with lastMessage
  conversation = await Conversation.findById(req.params.conversationId)
    .populate("participants", "name avatar")
    .populate("lastMessage");

  // Emit real-time message using Socket.io
  const io = req.app.get("io");
  if (io) {
    io.to(req.params.conversationId).emit("receiveMessage", message);
    if (recipientId) {
      io.emit("newMessageNotification", {
        conversationId: req.params.conversationId,
        message,
      });
    }
  }

  res.status(201).json({ success: true, message });
});

// @desc    Mark messages as read
// @route   POST /api/conversations/:conversationId/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  let conversation = await Conversation.findById(req.params.conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error("Not authorized to access this conversation");
  }

  // Mark messages as read
  await Message.updateMany(
    { conversation: req.params.conversationId, sender: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  // Reset unread count
  conversation.unreadCounts.set(req.user._id.toString(), 0);
  await conversation.save();

  // Populate conversation
  await conversation.populate("participants", "name avatar");
  await conversation.populate("lastMessage");

  // Convert unreadCounts Map to plain object for frontend
  const convObj = conversation.toObject();
  convObj.unreadCounts = Object.fromEntries(conversation.unreadCounts || new Map());

  // Emit real-time update
  const io = req.app.get("io");
  if (io) {
    io.to(req.params.conversationId).emit("messagesRead", {
      userId: req.user._id,
      conversationId: req.params.conversationId,
    });
  }

  res.status(200).json({ success: true, conversation: convObj });
});

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
};
