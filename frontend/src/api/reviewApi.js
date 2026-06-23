import axiosInstance from "./axiosInstance";

// Submit a new review after contract completion
export const submitReview = async (reviewData) => {
  const { data } = await axiosInstance.post("/reviews", reviewData);
  return data;
};

// Get all reviews for a specific user (freelancer profile page)
export const getReviewsForUser = async (userId) => {
  const { data } = await axiosInstance.get(`/reviews/user/${userId}`);
  return data;
};

// Check if logged-in user already reviewed this contract
export const checkIfReviewed = async (contractId) => {
  const { data } = await axiosInstance.get(`/reviews/check/${contractId}`);
  return data;
};