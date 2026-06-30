import axiosInstance from "./axiosInstance";

export const getConversations = async () => {
  const response = await axiosInstance.get("/conversations");
  return response.data;
};

export const getOrCreateConversationByContract = async (contractId) => {
  const response = await axiosInstance.post(
    `/conversations/contract/${contractId}`
  );
  return response.data;
};

export const getMessages = async (conversationId) => {
  const response = await axiosInstance.get(
    `/conversations/${conversationId}/messages`
  );
  return response.data;
};

export const sendMessage = async (conversationId, content) => {
  const response = await axiosInstance.post(
    `/conversations/${conversationId}/messages`,
    { content }
  );
  return response.data;
};

export const markAsRead = async (conversationId) => {
  const response = await axiosInstance.post(
    `/conversations/${conversationId}/read`
  );
  return response.data;
};
