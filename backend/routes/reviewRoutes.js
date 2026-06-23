const express = require("express");
const router = express.Router();

const {
  submitReview,
  getReviewsForUser,
  checkIfReviewed,
} = require("../controllers/reviewController");

const { protect } = require("../middlewares/authMiddleware");

/*
 * NOTE: check/:contractId must come BEFORE user/:userId
 * to avoid route conflicts with Express pattern matching.
 */

// GET /api/reviews/check/:contractId → has logged-in user reviewed?
router.get("/check/:contractId", protect, checkIfReviewed);

// POST /api/reviews → submit a new review
router.post("/", protect, submitReview);

// GET /api/reviews/user/:userId → get all reviews for a user
router.get("/user/:userId", getReviewsForUser);

module.exports = router;