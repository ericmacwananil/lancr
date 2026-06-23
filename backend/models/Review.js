const mongoose = require("mongoose");

/*
 * WHAT IS THIS FILE?
 * The Review model — created when a client reviews a freelancer
 * after a contract is completed.
 *
 * RELATIONSHIPS:
 * - contract  → which contract this review is for
 * - reviewer  → who wrote the review (client)
 * - reviewee  → who received the review (freelancer)
 */

const reviewSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },

    // The person writing the review (client)
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The person receiving the review (freelancer)
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /*
     * rating: 1 to 5 stars.
     * min/max enforced at DB level — Mongoose won't save
     * a rating of 0 or 6 even if someone sends it directly.
     */
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },

    comment: {
      type: String,
      required: [true, "Review comment is required"],
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [500, "Comment cannot exceed 500 characters"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * COMPOUND UNIQUE INDEX
 * Same pattern as Bid model (Feature 5).
 * One review per contract — reviewer can't review twice.
 *
 * { contract: 1, reviewer: 1 } means the combination of
 * contract ID + reviewer ID must be unique.
 * If client tries to review same contract twice →
 * MongoDB throws duplicate key error (code 11000).
 */
reviewSchema.index({ contract: 1, reviewer: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;