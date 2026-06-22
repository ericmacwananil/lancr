const mongoose = require("mongoose");

/*
 * WHAT IS THIS FILE?
 * This is the Job model — the blueprint for how a job is
 * stored in MongoDB. Every job posted by a client will
 * follow this exact structure.
 */

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Job description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [1, "Budget must be at least $1"],
    },

    /*
     * skillsRequired is an array of strings.
     * Example: ["React", "Node.js", "MongoDB"]
     * Freelancers can filter jobs by skills they know.
     */
    skillsRequired: {
      type: [String],
      default: [],
    },

    /*
     * status tracks the lifecycle of a job:
     * open       → just posted, accepting bids
     * assigned   → client accepted a bid, freelancer is working
     * under_review → freelancer submitted work, client reviewing
     * completed  → client released funds, job is done
     * archived   → job is closed/finished
     */
    status: {
      type: String,
      enum: ["open", "assigned", "under_review", "completed", "archived"],
      default: "open",
    },

    /*
     * ref: "User" creates a relationship between Job and User.
     * postedBy stores the ID of the client who created the job.
     * When we use .populate("postedBy"), Mongoose replaces the ID
     * with the actual user object from the User collection.
     */
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /*
     * assignedTo stores the freelancer's ID once a bid is accepted.
     * Starts as null — no freelancer assigned yet.
     * Gets filled in Feature 6 (Accept Bid / ACID Transaction).
     */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;