import axiosInstance from "./axiosInstance";

// Fetch platform overview stats
export const getAdminStats = async () => {
  const { data } = await axiosInstance.get("/admin/stats");
  return data;
};

// Fetch all users
export const getAllUsers = async () => {
  const { data } = await axiosInstance.get("/admin/users");
  return data;
};

// Fetch all jobs
export const getAllJobs = async () => {
  const { data } = await axiosInstance.get("/admin/jobs");
  return data;
};

// Fetch all contracts
export const getAllContracts = async () => {
  const { data } = await axiosInstance.get("/admin/contracts");
  return data;
};

// Delete a user by ID
export const deleteUser = async (userId) => {
  const { data } = await axiosInstance.delete(`/admin/users/${userId}`);
  return data;
};

// Delete a job by ID
export const deleteJob = async (jobId) => {
  const { data } = await axiosInstance.delete(`/admin/jobs/${jobId}`);
  return data;
};