const { z } = require("zod");

/*
 * Validates review submission data.
 * revieweeId = the freelancer's user ID being reviewed.
 * contractId = which contract this review is for.
 */
const submitReviewSchema = z.object({
  contractId: z.string({ required_error: "Contract ID is required" }),

  revieweeId: z.string({ required_error: "Reviewee ID is required" }),

  rating: z
    .number({ required_error: "Rating is required" })
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),

  comment: z
    .string({ required_error: "Comment is required" })
    .min(10, "Comment must be at least 10 characters")
    .max(500, "Comment cannot exceed 500 characters"),
});

module.exports = { submitReviewSchema };