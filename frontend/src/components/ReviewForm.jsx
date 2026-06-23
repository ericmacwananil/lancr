import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { submitReview } from "@/api/reviewApi";

/*
 * WHAT IS THIS COMPONENT?
 * A star rating form shown on ContractDetailPage
 * after contract is completed.
 *
 * Props:
 * - contract  → the completed contract
 * - onSuccess → callback after review submitted (to refresh UI)
 */

// ─── Star Rating Selector ─────────────────────────────────────
/*
 * Interactive 5-star selector.
 * hoveredRating: which star the mouse is currently over
 * selectedRating: the star the user actually clicked
 *
 * Visual logic:
 * - Stars up to hoveredRating → show as hovered (yellow outline)
 * - Stars up to selectedRating → show as filled (yellow solid)
 * - Stars above both → show as empty (gray)
 */
const StarSelector = ({ rating, onRate }) => {
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={32}
            className={`transition-colors ${
              star <= (hoveredRating || rating)
                ? "fill-yellow-400 text-yellow-400" // filled star
                : "fill-transparent text-slate-600"  // empty star
            }`}
          />
        </button>
      ))}
    </div>
  );
};

// ─── Rating Labels ─────────────────────────────────────────────
/*
 * Shows a text label based on the selected star count.
 * Makes the rating feel more meaningful than just a number.
 */
const ratingLabels = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};


// ─── Main Review Form ─────────────────────────────────────────
const ReviewForm = ({ contract, onSuccess }) => {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { mutate: handleSubmit, isPending } = useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      toast.success("Review submitted! Thank you for your feedback.");
      /*
       * Invalidate caches:
       * 1. contract → re-fetch to update review section
       * 2. profile → re-fetch freelancer profile (new averageRating)
       */
      queryClient.invalidateQueries({
        queryKey: ["contract", contract._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["profile", contract.freelancer?._id],
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }

    handleSubmit({
      contractId: contract._id,
      revieweeId: contract.freelancer?._id,
      rating,
      comment,
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">

      {/* Freelancer being reviewed */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800">
        <div className="flex items-center justify-center w-10 h-10 font-semibold text-green-400 rounded-full bg-green-500/20">
          {contract.freelancer?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-xs text-slate-400">Reviewing</p>
          <p className="font-semibold text-white">{contract.freelancer?.name}</p>
        </div>
      </div>

      {/* Star Rating */}
      <div>
        <label className="block mb-3 text-sm font-medium text-slate-300">
          Rating <span className="text-red-400">*</span>
        </label>
        <StarSelector rating={rating} onRate={setRating} />
        {/* Show label for selected rating */}
        {rating > 0 && (
          <p className="mt-2 text-sm font-medium text-yellow-400">
            {ratingLabels[rating]}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Comment <span className="text-red-400">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe your experience working with this freelancer. Was the work delivered on time? Did they communicate well?"
          rows={4}
          maxLength={500}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <p className={`mt-1 text-right text-xs ${
          comment.length > 450 ? "text-red-400" : "text-slate-500"
        }`}>
          {comment.length}/500
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="w-full rounded-lg bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
};

export default ReviewForm;