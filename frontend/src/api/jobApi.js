/*
 * WHAT IS THIS FILE?
 * Send the job data from the frontend to the backend.
 * All API functions related to jobs.
 * Every component that needs job data imports from here.
 */
import axiosInstance from "./axiosInstance";

// Fetch all jobs (with optional filters)
// params example: { status: "open", search: "react", page: 1 }
export const getAllJobs = async (params = {}) => {
  const { data } = await axiosInstance.get("/jobs", { params });
  return data;
};

// Fetch a single job by its ID
export const getJobById = async (jobId) => {
  const { data } = await axiosInstance.get(`/jobs/${jobId}`);
  return data;
};

// Fetch only the logged-in client's jobs
export const getMyJobs = async () => {
  const { data } = await axiosInstance.get("/jobs/my-jobs");
  return data;
};

// Create a new job (client only)
export const createJob = async (jobData) => {
  const { data } = await axiosInstance.post("/jobs", jobData);
  return data;
};

// Update an existing job
export const updateJob = async ({ jobId, jobData }) => {
  const { data } = await axiosInstance.put(`/jobs/${jobId}`, jobData);
  return data;
};

// Delete a job
export const deleteJob = async (jobId) => {
  const { data } = await axiosInstance.delete(`/jobs/${jobId}`);
  return data;
};