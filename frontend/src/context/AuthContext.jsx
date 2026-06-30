// FULL FLOW

// Website opens
//       ↓
// AuthProvider loads
//       ↓
// useQuery runs
//       ↓
// getMe()
//       ↓
// GET /api/auth/me
//       ↓
// Backend checks JWT cookie
//       ↓
// Returns user
//       ↓
// currentUser created
//       ↓
// Stored in Context
//       ↓
// Navbar, Dashboard, Profile
// can all access currentUser

import { createContext, useContext } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getMe, logoutUser } from "@/api/authApi";
import { toast } from "sonner";

/*
 * WHY CONTEXT + REACT QUERY TOGETHER?
 *
 * React Query handles the data fetching and caching.
 * Context just makes the result available everywhere without prop drilling.
 *
 * Flow on app load:
 * 1. AuthContext runs useQuery to call GET /api/auth/me
 * 2. If the HttpOnly cookie exists and is valid → returns user data
 * 3. If not → returns null (user is not logged in)
 * 4. Any component can call useAuth() to get the current user
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();

  /*
   * useQuery fetches and caches the current user.
   * queryKey: ["authUser"] — this is the unique name for this cache entry.
   * If we call queryClient.invalidateQueries(["authUser"]) anywhere,
   * it will re-fetch this data automatically.
   */
  const {
    data,
    isLoading: authLoading,
    isError,
  } = useQuery({
    queryKey: ["authUser"],
    queryFn: getMe,
    /*
     * retry: false — if /api/auth/me returns 401 (not logged in),
     * don't keep retrying. Just accept the user is not logged in.
     */
    retry: false,
    /*
     * staleTime: Infinity — user data doesn't go "stale" automatically.
     * We manually invalidate it on login/logout.
     */
    staleTime: Infinity,
  });

  /*
   * Helper to force a re-fetch of user data.
   * Called after login or register so the app immediately
   * reflects the new logged-in state.
   */
  const refetchUser = () => {
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  };

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(["authUser"], null); // Clear cache
      queryClient.clear(); // Clear all queries to be safe
      toast.success("Logged out successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to logout");
    },
  });

  // Extract user from the API response shape: { data: { user: {...} } }
  const currentUser = data?.data?.user || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,    // the logged-in user object (or null)
        authLoading,    // true while the /me request is in flight
        isError,        // true if the /me request failed
        refetchUser,    // call this after login/logout
        logout,         // call this to logout user
        isLoggingOut,   // true while logout request is in flight
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/*
 * Custom hook — instead of importing useContext(AuthContext)
 * in every component, they just call useAuth().
 * Cleaner and easier to use.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

