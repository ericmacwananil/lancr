const express = require("express");
const router = express.Router();
const {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
} = require("../controllers/messageController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

// Get all conversations for current user
router.get("/", getConversations);

// Get or create conversation for a contract
router.post("/contract/:contractId", getOrCreateConversation);

// Get messages for a conversation
router.get("/:conversationId/messages", getMessages);

// Send a message
router.post("/:conversationId/messages", sendMessage);

// Mark messages as read
router.post("/:conversationId/read", markAsRead);

module.exports = router;
