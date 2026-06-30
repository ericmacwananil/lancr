import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Briefcase, Edit, MessageSquare, ArrowLeft } from "lucide-react";

import { getUserProfile } from "@/api/userApi";
import { getReviewsForUser } from "@/api/reviewApi";
import { useAuth } from "@/context/AuthContext";
import EditProfileModal from "@/components/EditProfileModal";
import Navbar from "@/components/Navbar";

const FreelancerProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ─── Fetch Profile ─────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
  });

  // ─── Fetch Reviews ─────────────────────────────────────────
  /*
   * Fetches all reviews where reviewee = this user.
   * Separate query from profile so they load independently.
   * If reviews fail, profile still shows.
   */
  const { data: reviewsData } = useQuery({
    queryKey: ["userReviews", userId],
    queryFn: () => getReviewsForUser(userId),
    enabled: !!userId,
  });

  const user = data?.data?.user;
  const reviews = reviewsData?.data?.reviews || [];

  // ─── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-10">
          <div className="text-center">
            <p className="text-xl font-semibold text-red-400">
              {error?.message || "Failed to load profile"}
            </p>
            <p className="mt-2 text-slate-400">
              The user may not exist or was deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-3xl px-4 py-10 mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* ── Profile Header Card ──────────────────────────── */}
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
                  <div className="flex items-center justify-center w-full h-full text-2xl font-bold text-violet-400">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + Role + Rating */}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user?.name}
                </h1>

                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium ${
                  user?.role === "freelancer"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}>
                  <Briefcase size={10} />
                  {user?.role}
                </span>

                {/*
                 * Show average rating if it exists.
                 * Only freelancers with completed contracts will have this.
                 */}
                {user?.averageRating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm text-yellow-400">
                      {user.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({user.totalReviews} {user.totalReviews === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Button — only on own profile */}
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

          {/* Earnings — only on own profile */}
          {currentUser?._id?.toString() === userId && (
            <div className="p-4 mt-6 rounded-xl bg-slate-800">
              <p className="text-sm text-slate-400">Total Earnings</p>
              <p className="text-2xl font-bold text-green-400">
                ${user?.earnings?.toFixed(2) || "0.00"}
              </p>
            </div>
          )}
        </div>

        {/* ── Portfolio Section ────────────────────────────── */}
        <div className="p-8 mt-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Portfolio
          </h3>
          <div className="flex items-center justify-center h-32 border border-dashed rounded-xl border-slate-700">
            <p className="text-slate-500">
              Portfolio coming soon (Feature 8 — File Uploads)
            </p>
          </div>
        </div>

        {/* ── Reviews Section ──────────────────────────────── */}
        <div className="p-8 mt-6 border rounded-2xl border-slate-800 bg-slate-900">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Reviews</h3>

            {/*
             * Average Rating Badge — only shown if user has reviews.
             * Shows the number + total count in a yellow badge.
             */}
            {user?.averageRating > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-yellow-400">
                  {user.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-slate-400">
                  ({user.totalReviews} {user.totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>

          {/* No Reviews Empty State */}
          {reviews.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <MessageSquare size={40} className="mb-3 text-slate-700" />
              <p className="text-slate-400">No reviews yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Reviews appear here after completed contracts
              </p>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 && (
            <div className="space-y-5">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="p-5 border rounded-xl border-slate-800 bg-slate-800/50"
                >
                  {/* Reviewer Info + Stars */}
                  <div className="flex items-start justify-between gap-4">

                    {/* Reviewer Avatar + Name + Date */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center text-sm font-semibold rounded-full shrink-0 h-9 w-9 bg-violet-500/20 text-violet-400">
                        {review.reviewer?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {review.reviewer?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/*
                     * Star Display (read-only, not interactive).
                     * Array.from({ length: 5 }) → [undefined, undefined, ...]
                     * We map over it with index to render 5 stars.
                     * index + 1 <= review.rating → filled yellow star
                     * index + 1 > review.rating  → empty gray star
                     */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          className={
                            index + 1 <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-transparent text-slate-600"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Review Comment */}
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Edit Profile Modal */}
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