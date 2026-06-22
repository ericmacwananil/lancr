const mongoose = require("mongoose");

/*
 * WHAT IS THIS FILE?
 * The Bid model — blueprint for how a bid is stored in MongoDB.
 *
 * RELATIONSHIP DIAGRAM:
 * User (freelancer) → places Bid → on a Job (posted by client)
 *
 * So a Bid connects THREE things:
 * 1. Which job is being bid on   (job field)
 * 2. Who is placing the bid      (freelancer field)
 * 3. What are the bid details    (amount, coverLetter, status)
 */

const bidSchema = new mongoose.Schema(
  {
    /*
     * ref: "Job" creates a relationship to the Job model.
     * When we .populate("job"), Mongoose replaces this ID
     * with the full Job object automatically.
     */
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job reference is required"],
    },

    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Freelancer reference is required"],
    },

    amount: {
      type: Number,
      required: [true, "Bid amount is required"],
      min: [1, "Bid amount must be at least $1"],
    },

    coverLetter: {
      type: String,
      required: [true, "Cover letter is required"],
      minlength: [30, "Cover letter must be at least 30 characters"],
      maxlength: [1000, "Cover letter cannot exceed 1000 characters"],
    },

    /*
     * status tracks the lifecycle of a bid:
     * pending  → just submitted, waiting for client decision
     * accepted → client accepted this bid (contract will be created)
     * rejected → client rejected this bid
     */
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

/*
 * COMPOUND UNIQUE INDEX
 * This enforces that ONE freelancer can only bid ONCE per job.
 *
 * { job: 1, freelancer: 1 } means the combination of
 * job ID + freelancer ID must be unique in the collection.
 *
 * If freelancer tries to bid on the same job twice,
 * MongoDB throws a duplicate key error (code 11000)
 * which our errorHandler.js catches and returns a clean message.
 *
 * unique: true at the schema level.
 */
bidSchema.index({ job: 1, freelancer: 1 }, { unique: true });

const Bid = mongoose.model("Bid", bidSchema);

module.exports = Bid;