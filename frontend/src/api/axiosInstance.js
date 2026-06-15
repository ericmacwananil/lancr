// frontend/src/api/axiosInstance.js
// Central Axios config — all API calls go through this.

import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true, // Send HttpOnly cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor — handle global errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || "Something went wrong";

    // If 401, you can redirect to login here later
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;

