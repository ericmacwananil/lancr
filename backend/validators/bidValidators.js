const { z } = require("zod");

/*
 * WHAT IS THIS FILE?
 * Zod validation for bid data.
 * Runs before the bid is saved to DB.
 */

const submitBidSchema = z.object({
  /*
   * jobId comes from req.body — the frontend sends
   * which job this bid is for.
   */
  jobId: z.string({ required_error: "Job ID is required" }),

  amount: z
    .number({ required_error: "Bid amount is required" })
    .min(1, "Bid amount must be at least $1"),

  coverLetter: z
    .string({ required_error: "Cover letter is required" })
    .min(30, "Cover letter must be at least 30 characters")
    .max(1000, "Cover letter cannot exceed 1000 characters"),
});

/*
 * For updating bid status (accept/reject).
 * Only "accepted" or "rejected" are valid values.
 */
const updateBidStatusSchema = z.object({
  status: z.enum(["accepted", "rejected"], {
    errorMap: () => ({ message: "Status must be accepted or rejected" }),
  }),
});

module.exports = { submitBidSchema, updateBidStatusSchema };