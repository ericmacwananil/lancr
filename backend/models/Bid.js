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
     * countered → client made a counter-offer, waiting for freelancer response
     * accepted → client accepted this bid (contract will be created)
     * rejected → client rejected this bid
     */
    status: {
      type: String,
      enum: ["pending", "countered", "accepted", "rejected"],
      default: "pending",
    },

    /*
     * Track who made the last offer
     */
    lastOfferBy: {
      type: String,
      enum: ["client", "freelancer"],
      default: "freelancer",
    },

    /*
     * Negotiation history: track all offers/counter-offers
     */
    negotiationHistory: [
      {
        amount: {
          type: Number,
          required: true,
        },
        message: {
          type: String,
          default: "",
        },
        offeredBy: {
          type: String,
          enum: ["client", "freelancer"],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Pre-save hook to initialize negotiation history on first bid
bidSchema.pre("save", async function () {
  if (this.isNew && this.negotiationHistory.length === 0) {
    this.negotiationHistory.push({
      amount: this.amount,
      message: this.coverLetter,
      offeredBy: "freelancer",
      timestamp: this.createdAt || new Date(),
    });
  }
});


const Bid = mongoose.model("Bid", bidSchema);

module.exports = Bid;