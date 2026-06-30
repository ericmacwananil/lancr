import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
} from "../api/messageApi";
import { io } from "socket.io-client";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});

const ChatPage = () => {
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch all conversations
  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  // Fetch selected conversation messages
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", selectedConversationId],
    queryFn: () => getMessages(selectedConversationId),
    enabled: !!selectedConversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }) =>
      sendMessage(conversationId, content),
    onMutate: async ({ conversationId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(["messages", conversationId]);

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(["messages", conversationId]);

      // Optimistically update to the new value
      const optimisticMessage = {
        _id: Date.now().toString(),
        content,
        sender: user,
        conversation: conversationId,
        createdAt: new Date().toISOString(),
        readBy: [user._id],
      };

      queryClient.setQueryData(["messages", conversationId], (old) => ({
        ...old,
        messages: [...(old?.messages || []), optimisticMessage],
      }));

      return { previousMessages };
    },
    onError: (err, { conversationId }, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", conversationId], context.previousMessages);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["conversations"]);
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries(["conversations"]);
    },
  });

  // Socket setup
  useEffect(() => {
    if (user) {
      socket.emit("userOnline", user._id);
    }

    socket.on("receiveMessage", (message) => {
      console.log("Received message via socket:", message);
      const messageConversationId = 
        typeof message.conversation === "object" ? message.conversation._id : message.conversation;
      
      if (messageConversationId === selectedConversationId) {
        queryClient.setQueryData(["messages", selectedConversationId], (old) => {
          const existingMessages = old?.messages || [];
          // Check if message already exists to avoid duplicates
          const messageExists = existingMessages.some(m => m._id === message._id);
          if (!messageExists) {
            return {
              ...old,
              messages: [...existingMessages, message],
            };
          }
          return old;
        });
        // Auto-mark as read if in conversation - only if the message is not from us
        let senderId;
        if (typeof message.sender === "object" && message.sender !== null) {
          senderId = message.sender._id;
        } else {
          senderId = message.sender;
        }
        
        if (String(senderId) !== String(user?._id)) {
          markAsReadMutation.mutate(selectedConversationId);
        }
      }
      queryClient.invalidateQueries(["conversations"]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [user, selectedConversationId, queryClient]);

  // Join conversation room when selected and mark as read
  useEffect(() => {
    if (selectedConversationId) {
      socket.emit("joinConversation", selectedConversationId);
      markAsReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const content = e.target.message.value.trim();
    if (!content || !selectedConversationId) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content,
    });
    e.target.reset();
  };

  const conversations = conversationsData?.conversations || [];
  const messages = messagesData?.messages || [];

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData, messages]);

  const selectedConversation = conversations.find(
    (c) => c._id === selectedConversationId
  );
  const otherParticipant = selectedConversation?.participants?.find(
    (p) => p._id.toString() !== user?._id?.toString()
  );

  return (
    <div className="min-h-screen text-white bg-slate-950">
      <div className="flex h-[calc(100vh-80px)]">
        {/* Conversation List Sidebar */}
        <div className="flex flex-col w-80 border-r border-slate-800 bg-slate-900">
          <div className="p-4 border-b border-slate-800">
            <Link
              to={user?.role === "client" ? "/client-dashboard" : "/freelancer-dashboard"}
              className="flex gap-2 items-center mb-3 text-slate-400 hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <h2 className="text-lg font-bold">Messages</h2>
          </div>
          <div className="overflow-y-auto flex-1">
            {loadingConversations ? (
              <div className="p-4 text-slate-500">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherUser = conversation.participants.find(
                  (p) => p._id.toString() !== user?._id?.toString()
                );
                const isSelected = conversation._id === selectedConversationId;
                const unreadCount = conversation.unreadCounts?.[user?._id?.toString()] || 0;
                return (
                  <div
                    key={conversation._id}
                    onClick={() => setSelectedConversationId(conversation._id)}
                    className={cn(
                      "p-4 border-b transition-colors cursor-pointer border-slate-800",
                      isSelected ? "bg-slate-800" : "hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <div className="flex justify-center items-center w-10 h-10 bg-violet-600 rounded-full">
                          {otherUser?.avatar ? (
                            <img
                              src={otherUser.avatar}
                              alt={otherUser.name}
                              className="object-cover w-full h-full rounded-full"
                            />
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <span className="flex absolute -top-1 -right-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-medium truncate">
                            {otherUser?.name}
                          </p>
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-sm truncate text-slate-400">
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-col flex-1 bg-slate-950">
          {!selectedConversationId ? (
            <div className="flex flex-col flex-1 justify-center items-center text-slate-500">
              <MessageSquare size={64} className="mb-4 opacity-20" />
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900">
                <div className="flex gap-3 items-center">
                  <div className="flex justify-center items-center w-10 h-10 bg-violet-600 rounded-full">
                    {otherParticipant?.avatar ? (
                      <img
                        src={otherParticipant.avatar}
                        alt={otherParticipant.name}
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{otherParticipant?.name}</p>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {loadingMessages ? (
                  <div className="text-center text-slate-500">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="mt-8 text-center text-slate-500">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    // Get sender ID - handle both cases where sender is object or string
                    let senderId;
                    if (typeof msg.sender === "object" && msg.sender !== null) {
                      senderId = msg.sender._id;
                    } else {
                      senderId = msg.sender;
                    }
                    
                    // Get current user ID
                    const currentUserId = user?._id;
                    
                    // Compare as strings to avoid type issues
                    const isSender = String(senderId) === String(currentUserId);
                    
                    return (
                      <div
                        key={msg._id}
                        className={cn(
                          "flex w-full",
                          isSender ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            isSender
                              ? "bg-violet-600 text-white"
                              : "bg-slate-800 text-slate-200"
                          )}
                        >
                          <p>{msg.content}</p>
                          <p
                            className={cn(
                              "mt-1 text-xs",
                              isSender ? "text-violet-200" : "text-slate-400"
                            )}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-800 bg-slate-900">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    name="message"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 text-white rounded-xl border bg-slate-800 border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={sendMessageMutation.isPending}
                    className="flex gap-2 items-center px-6 py-3 text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Send size={18} />
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
