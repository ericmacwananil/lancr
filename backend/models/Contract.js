const mongoose = require("mongoose");

/*
 * WHAT IS THIS FILE?
 * The Contract model — created when a client accepts a bid.
 * It represents the agreement between client and freelancer.
 *
 * CONTRACT LIFECYCLE:
 * pending_payment → funded → under_review → completed
 *
 * pending_payment: Contract created, waiting for Stripe payment
 * funded:          Client paid via Stripe, freelancer can start work
 * under_review:    Freelancer submitted work, client is reviewing
 * completed:       Client released funds, job is done ✅
 */

const contractSchema = new mongoose.Schema(
  {
    /*
     * Which job this contract is for.
     * ref: "Job" links to the Job model.
     */
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    // The client who posted the job and accepted the bid
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The freelancer whose bid was accepted
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /*
     * The amount the freelancer bid (not the job budget).
     * This is the ACTUAL amount that will be paid.
     */
    agreedAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending_payment", "funded", "under_review", "refund_requested", "completed", "refunded"],
      default: "pending_payment",
    },

    /*
     * stripePaymentIntentId is saved after Feature 7 (Stripe).
     * It's the unique ID Stripe gives us for each payment.
     * We use it to verify the payment was successful.
     * Empty for now — filled in Feature 7.
     */
    stripePaymentIntentId: {
      type: String,
      default: "",
    },

    /*
     * deliveryFile stores the Cloudinary URL of the
     * work file uploaded by the freelancer.
     * Empty for now — filled in Feature 8.
     */
    deliveryFile: {
      type: String,
      default: "",
    },

    // Refund-related fields
    refundReason: {
      type: String,
      default: "",
    },
    refundRequestedAt: {
      type: Date,
      default: null,
    },
    refundReviewedAt: {
      type: Date,
      default: null,
    },
    adminDecision: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Contract = mongoose.model("Contract", contractSchema);

module.exports = Contract;