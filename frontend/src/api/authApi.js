/*
 * WHY A SEPARATE API FILE?
 * Instead of writing fetch/axios calls inside components,
 * we keep all API functions in one place.
 * If the backend URL changes, we update it here — not in 10 components.
 */
import axiosInstance from "./axiosInstance";

// Called on Register page form submit
export const registerUser = async (userData) => {
  const { data } = await axiosInstance.post("/auth/register", userData);
  return data; // returns { success, message, data: { user } }
};

// Called on Login page form submit
export const loginUser = async (credentials) => {
  const { data } = await axiosInstance.post("/auth/login", credentials);
  return data;
};

// Called on logout button click
export const logoutUser = async () => {
  const { data } = await axiosInstance.post("/auth/logout");
  return data;
};

// Called on app load to check if user is already logged in
export const getMe = async () => {
  const { data } = await axiosInstance.get("/auth/me");
  return data;
};