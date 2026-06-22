// ┌─────────────────────────────────────────────────────────────────────────────┐
// │                          Freelancer Profile Page                            │
// │                    (Dark Theme - bg-slate-950)                              │
// └─────────────────────────────────────────────────────────────────────────────┘


//                  ┌───────────────────────────────────────────────┐
//                  │                                               │
//                  │   ○ Avatar         John Doe          [Edit ✎] │
//                  │                                               │
//                  │                   🟢 Freelancer               │
//                  │                   ⭐ 4.8 (28 Reviews)         │
//                  │                                               │
//                  │───────────────────────────────────────────────│
//                  │                                               │
//                  │ ABOUT                                         │
//                  │                                               │
//                  │ Full Stack MERN Developer with 3+ years of    │
//                  │ experience building scalable applications.     │
//                  │ Passionate about React, Node.js and UI/UX.     │
//                  │                                               │
//                  │───────────────────────────────────────────────│
//                  │                                               │
//                  │ SKILLS                                        │
//                  │                                               │
//                  │ React   Node.js   Express   MongoDB           │
//                  │ Tailwind   JWT   Docker   AWS                │
//                  │                                               │
//                  │───────────────────────────────────────────────│
//                  │                                               │
//                  │ Total Earnings                               │
//                  │                                               │
//                  │           $12,540.00                         │
//                  │                                               │
//                  └───────────────────────────────────────────────┘



//                  ┌───────────────────────────────────────────────┐
//                  │                                               │
//                  │              Portfolio                        │
//                  │                                               │
//                  │   ┌───────────────────────────────────────┐   │
//                  │   │                                       │   │
//                  │   │      Portfolio Coming Soon...         │   │
//                  │   │      Feature 8 - File Uploads         │   │
//                  │   │                                       │   │
//                  │   └───────────────────────────────────────┘   │
//                  │                                               │
//                  └───────────────────────────────────────────────┘
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Briefcase, Edit } from "lucide-react";

import { getUserProfile } from "@/api/userApi";
import { useAuth } from "@/context/AuthContext";
import EditProfileModal from "@/components/EditProfileModal";

/*
 * WHAT IS THIS PAGE?
 * This page shows a freelancer's public profile.
 * URL: /profile/:userId
 * Example: /profile/64abc123
 *
 * useParams() reads the :userId from the URL.
 * useQuery() fetches the profile data from the backend.
 */

const FreelancerProfilePage = () => {
  /*
   * useParams() gives us the URL parameters.
   * Since our route is /profile/:userId,
   * useParams() returns { userId: "64abc123" }
   */
  const { userId } = useParams();

  // Get the currently logged-in user to show Edit button
  const { currentUser } = useAuth();

  // Controls whether the Edit Profile modal is open or closed
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  /*
   * useQuery — fetches data from the backend.
   *
   * queryKey: ["profile", userId]
   * → Unique cache key for this specific profile.
   * → If userId changes (different profile page), it re-fetches.
   * → React Query caches this so navigating back is instant.
   *
   * queryFn: the function that actually calls the API.
   * → Must return a promise.
   *
   * enabled: !!userId
   * → Only run the query if userId exists.
   * → !! converts to boolean: "64abc" → true, undefined → false
   */
  const {
    data,
    isLoading, // true while API call is in progress
    isError,   // true if API call failed
    error,     // the actual error object
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
  });

  // The actual user object from the API response
  const user = data?.data?.user;

  // ─── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        {/* Simple spinner while data loads */}
        <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-400">
            {error?.message || "Failed to load profile"}
          </p>
          <p className="mt-2 text-slate-400">
            The user may not exist or was deleted.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main Profile UI ───────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-10 bg-slate-950">
      <div className="max-w-3xl mx-auto">

        {/* ── Profile Header Card ─────────────────────────── */}
        <div className="p-8 border rounded-2xl border-slate-800 bg-slate-900">

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">

              {/* Avatar */}
              <div className="w-20 h-20 overflow-hidden border-2 rounded-full border-violet-500 bg-slate-700">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  /*
                   * If no avatar, show initials.
                   * user.name[0] gets the first character.
                   * toUpperCase() makes it capital.
                   */
                  <div className="flex items-center justify-center w-full h-full text-2xl font-bold text-violet-400">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name, Role, Rating */}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user?.name}
                </h1>

                {/* Role Badge */}
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium ${
                  user?.role === "freelancer"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}>
                  <Briefcase size={10} />
                  {user?.role}
                </span>

                {/* Star Rating */}
                {user?.averageRating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm text-yellow-400">
                      {user.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({user.totalReviews} reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/*
             * Edit Button — only show if viewing YOUR OWN profile.
             * currentUser?._id === userId checks if the logged-in
             * user is the same as the profile being viewed.
             * toString() is needed because MongoDB IDs are objects.
             */}
            {currentUser?._id?.toString() === userId && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm transition border rounded-lg border-slate-700 text-slate-300 hover:border-violet-500 hover:text-violet-400"
              >
                <Edit size={14} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Bio */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold tracking-wider uppercase text-slate-500">
              About
            </h3>
            <p className="leading-relaxed text-slate-300">
              {user?.bio || "No bio added yet."}
            </p>
          </div>

          {/* Skills */}
          {user?.skills?.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold tracking-wider uppercase text-slate-500">
                Skills
              </h3>
              {/*
               * .map() loops through the skills array and
               * renders a badge for each skill.
               * key={skill} is required by React to track
               * each item in the list uniquely.
               */}
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 text-sm border rounded-full border-violet-500/30 bg-violet-500/10 text-violet-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Earnings — only show on own profile */}
          {currentUser?._id?.toString() === userId && (
            <div className="p-4 mt-6 rounded-xl bg-slate-800">
              <p className="text-sm text-slate-400">Total Earnings</p>
              <p className="text-2xl font-bold text-green-400">
                ${user?.earnings?.toFixed(2) || "0.00"}
              </p>
            </div>
          )}
        </div>

        {/* ── Portfolio Section (Placeholder) ─────────────── */}
        <div className="p-8 mt-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Portfolio
          </h3>
          {/*
           * Portfolio is a placeholder for now.
           * In a real app, freelancers would upload
           * project screenshots or links here.
           * We'll populate this with real data in Feature 8
           * when we add Cloudinary file uploads.
           */}
          <div className="flex items-center justify-center h-32 border border-dashed rounded-xl border-slate-700">
            <p className="text-slate-500">
              Portfolio coming soon (Feature 8 — File Uploads)
            </p>
          </div>
        </div>

      </div>

      {/*
       * Edit Profile Modal.
       * isOpen controls whether it's visible.
       * onClose closes it when user clicks cancel or outside.
       * user passes current data to pre-fill the form.
       */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
      />
    </div>
  );
};

export default FreelancerProfilePage;












// Complete flow

// User opens

// /profile/123
//         │
//         ▼
// useQuery starts
//         │
//         ▼
// Calls getUserProfile("123")
//         │
//         ▼
// Backend API
//         │
//         ▼
// MongoDB
//         │
//         ▼
// Returns user data
//         │
//         ▼
// React Query stores it in cache
//         │
//         ▼
// data becomes available
//         │
//         ▼
// Page displays profile