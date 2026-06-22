/*
 * WHAT IS THIS FILE?
 * All API calls related to users go here.
 * We import these functions in our pages/components
 * and use them with React Query.
 */
import axiosInstance from "./axiosInstance";

/*
 * Fetch any user's public profile by their ID.
 * Called on FreelancerProfilePage.
 * userId comes from the URL: /profile/64abc123
 */
export const getUserProfile = async (userId) => {
  const { data } = await axiosInstance.get(`/users/${userId}`);
  return data;
};

/*
 * Update the logged-in user's own profile.
 * Called from EditProfileModal when form is submitted.
 * profileData = { bio, skills, avatar }
 */
export const updateUserProfile = async (profileData) => {
  const { data } = await axiosInstance.put("/users/profile", profileData);
  return data;
};