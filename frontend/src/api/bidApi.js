/*
 * WHAT IS THIS FILE?
 * All API functions related to bids.
 */
import axiosInstance from "./axiosInstance";

// Freelancer submits a bid
// bidData = { jobId, amount, coverLetter }
export const submitBid = async (bidData) => {
  const { data } = await axiosInstance.post("/bids", bidData);
  return data;
};

// Client fetches all bids on their job
export const getBidsForJob = async (jobId) => {
  const { data } = await axiosInstance.get(`/bids/job/${jobId}`);
  return data;
};

// Client accepts or rejects a bid
// statusData = { status: "accepted" | "rejected" }
export const updateBidStatus = async ({ bidId, status }) => {
  const { data } = await axiosInstance.put(`/bids/${bidId}/status`, { status });
  return data;
};

// Freelancer fetches their own bids
export const getMyBids = async () => {
  const { data } = await axiosInstance.get("/bids/my-bids");
  return data;
};

// Client makes a counter-offer
export const clientCounterOffer = async ({ bidId, amount, message }) => {
  const { data } = await axiosInstance.post(`/bids/${bidId}/counter-offer`, { amount, message });
  return data;
};

// Freelancer responds to counter-offer
export const freelancerRespondToCounter = async ({ bidId, action, amount, message }) => {
  const { data } = await axiosInstance.post(`/bids/${bidId}/respond`, { action, amount, message });
  return data;
};