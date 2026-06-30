const Review = require("../models/Review");
const User = require("../models/User");
const Contract = require("../models/Contract");
const { submitReviewSchema } = require("../validators/reviewValidators");

/*
 * WHAT IS THIS FILE?
 * Two controllers:
 * 1. submitReview     → client leaves a review after contract completes
 * 2. getReviewsForUser → anyone can see a freelancer's reviews
 */


// ─── SUBMIT REVIEW ────────────────────────────────────────────
/*
 * @route   POST /api/reviews
 * @access  Private — Client only
 *
 * FLOW:
 * 1. Validate input
 * 2. Check contract is completed
 * 3. Check reviewer owns this contract
 * 4. Save the review
 * 5. Recalculate freelancer's averageRating
 */
const submitReview = async (req, res) => {
  try {
    // Step 1: Validate
    const validation = submitReviewSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const { contractId, revieweeId, rating, comment } = validation.data;

    // Step 2: Find the contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    // Step 3: Contract must be completed before reviewing
    if (contract.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review after the contract is completed",
      });
    }

    // Step 4: Only the client on this contract can review
    if (contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the client on this contract can leave a review",
      });
    }

    // Step 5: Verify reviewee is actually the freelancer on this contract
    if (contract.freelancer.toString() !== revieweeId) {
      return res.status(400).json({
        success: false,
        message: "You can only review the freelancer on this contract",
      });
    }

    // Step 6: Check if already reviewed
    /*
     * The unique index handles this at DB level,
     * but checking here gives a friendlier error message.
     */
    const existingReview = await Review.findOne({
      contract: contractId,
      reviewer: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this contract",
      });
    }

    // Step 7: Save the review
    const review = await Review.create({
      contract: contractId,
      reviewer: req.user._id,
      reviewee: revieweeId,
      rating,
      comment,
    });

    /*
     * Step 8: Recalculate freelancer's averageRating.
     *
     * WHY RECALCULATE EVERY TIME?
     * Instead of storing a running average (which can drift),
     * we recalculate from ALL reviews each time one is added.
     * This is accurate and simple.
     *
     * MongoDB aggregate():
     * - $match: find all reviews for this freelancer
     * - $group: group them all together
     * - $avg: calculate the average rating
     *
     * result looks like: [{ _id: null, avgRating: 4.3, count: 7 }]
     */
    const result = await Review.aggregate([
      { $match: { reviewee: contract.freelancer } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const avgRating = result[0]?.avgRating || 0;
    const totalReviews = result[0]?.count || 0;

    /*
     * Update the freelancer's profile with new averageRating.
     * Math.round(avgRating * 10) / 10 rounds to 1 decimal place.
     * Example: 4.333 → 4.3
     */
    await User.findByIdAndUpdate(contract.freelancer, {
      $set: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews,
      },
    });

    await review.populate("reviewer", "name avatar");

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      data: { review },
    });

  } catch (error) {
    console.error("submitReview error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET REVIEWS FOR USER ─────────────────────────────────────
/*
 * @route   GET /api/reviews/user/:userId
 * @access  Public — anyone can see a freelancer's reviews
 */
const getReviewsForUser = async (req, res) => {
  try {
    /*
     * Find all reviews where reviewee = the requested userId.
     * Populate reviewer with name + avatar for display.
     * Sort newest first.
     */
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate("reviewer", "name avatar")
      .populate("contract", "job")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: {
        reviews,
        totalReviews: reviews.length,
      },
    });

  } catch (error) {
    console.error("getReviewsForUser error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── CHECK IF REVIEWED ────────────────────────────────────────
/*
 * @route   GET /api/reviews/check/:contractId
 * @access  Private
 *
 * Frontend uses this to know whether to show
 * the "Leave a Review" form or "Already reviewed" message.
 */
const checkIfReviewed = async (req, res) => {
  try {
    const review = await Review.findOne({
      contract: req.params.contractId,
      reviewer: req.user._id,
    });

    return res.status(200).json({
      success: true,
      data: {
        hasReviewed: !!review, // true if review exists, false if not
        review: review || null,
      },
    });

  } catch (error) {
    console.error("checkIfReviewed error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { submitReview, getReviewsForUser, checkIfReviewed };