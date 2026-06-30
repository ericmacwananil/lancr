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
 */
const updateBidStatusSchema = z.object({
  status: z.enum(["accepted", "rejected", "countered"], {
    errorMap: () => ({ message: "Status must be accepted, rejected, or countered" }),
  }),
});

/*
 * For counter-offers (client or freelancer)
 */
const counterOfferSchema = z.object({
  amount: z
    .number({ required_error: "Counter-offer amount is required" })
    .min(1, "Amount must be at least $1"),
  message: z
    .string({ required_error: "Message is required" })
    .min(1, "Message cannot be empty")
    .max(1000, "Message cannot exceed 1000 characters"),
});

/*
 * For freelancer responding to counter-offer
 */
const respondToCounterSchema = z.object({
  action: z.enum(["accept", "counter", "reject"], {
    errorMap: () => ({ message: "Action must be accept, counter, or reject" }),
  }),
  amount: z.number().min(1).optional(),
  message: z.string().max(1000).optional(),
}).refine((data) => {
  if (data.action === "counter" && !data.amount) {
    return false;
  }
  return true;
}, {
  message: "Amount is required when action is counter",
});

module.exports = {
  submitBidSchema,
  updateBidStatusSchema,
  counterOfferSchema,
  respondToCounterSchema,
};