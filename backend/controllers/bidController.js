const Bid = require("../models/Bid");
const Job = require("../models/Job");
const {
  submitBidSchema,
  updateBidStatusSchema,
  counterOfferSchema,
  respondToCounterSchema,
} = require("../validators/bidValidators");
const { createContractFromBid } = require("../services/contractService");

/*
 * WHAT IS THIS FILE?
 * Business logic for all bid operations:
 * 1. submitBid      → freelancer places a bid on a job
 * 2. getBidsForJob  → get all bids on a specific job
 * 3. updateBidStatus → client accepts or rejects a bid
 * 4. clientCounterOffer → client makes a counter-offer
 * 5. freelancerRespondToCounter → freelancer responds to counter-offer
 */


// ─── SUBMIT BID ───────────────────────────────────────────────
/*
 * @route   POST /api/bids
 * @access  Private — Freelancer only
 */
const submitBid = async (req, res) => {
  try {
    // Step 1: Validate incoming data
    const validation = submitBidSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const { jobId, amount, coverLetter } = validation.data;

    // Step 2: Check if the job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Step 3: Check if job is still open for bids
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer accepting bids",
      });
    }

    // Step 4: Prevent client from bidding on their own job
    if (job.postedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot bid on your own job",
      });
    }

    // Step 5: Create the bid
    const existingBids = await Bid.find({
      job: jobId,
      freelancer: req.user._id,
    });

    const hasActiveBid = existingBids.some(bid => 
      bid.status === "pending" || bid.status === "accepted" || bid.status === "countered"
    );

    if (hasActiveBid) {
      return res.status(400).json({
        success: false,
        message: "You have an active bid on this job already",
      });
    }

    // Step 6: Save the bid
    const bid = await Bid.create({
      job: jobId,
      freelancer: req.user._id,
      amount,
      coverLetter,
    });

    await bid.populate("freelancer", "name avatar bio skills averageRating");

    return res.status(201).json({
      success: true,
      message: "Bid submitted successfully",
      data: { bid },
    });

  } catch (error) {
    console.error("submitBid error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET BIDS FOR JOB ─────────────────────────────────────────
const getBidsForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view bids on your own jobs",
      });
    }

    const bids = await Bid.find({ job: req.params.jobId })
      .populate("freelancer", "name avatar bio skills averageRating")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Bids fetched successfully",
      data: {
        bids,
        totalBids: bids.length,
      },
    });

  } catch (error) {
    console.error("getBidsForJob error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── UPDATE BID STATUS (Accept / Reject) ─────────────────────
const updateBidStatus = async (req, res) => {
  try {
    const validation = updateBidStatusSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const { status } = validation.data;

    const bid = await Bid.findById(req.params.id).populate("job");
    if (!bid) {
      return res.status(404).json({ success: false, message: "Bid not found" });
    }

    if (bid.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only manage bids on your own jobs",
      });
    }

    if (bid.job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer open for bid acceptance",
      });
    }

    if (bid.status !== "pending" && bid.status !== "countered") {
      return res.status(400).json({
        success: false,
        message: `This bid has already been ${bid.status}`,
      });
    }

    bid.status = status;
    await bid.save();

    return res.status(200).json({
      success: true,
      message: `Bid ${status} successfully`,
      data: { bid },
    });

  } catch (error) {
    console.error("updateBidStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── CLIENT COUNTER-OFFER ──────────────────────────────────────
const clientCounterOffer = async (req, res) => {
  try {
    const validation = counterOfferSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const { amount, message } = validation.data;

    const bid = await Bid.findById(req.params.id).populate("job");
    if (!bid) {
      return res.status(404).json({ success: false, message: "Bid not found" });
    }

    if (bid.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only counter offers on your own jobs",
      });
    }

    if (bid.job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer open for negotiations",
      });
    }

    if (bid.status !== "pending" && bid.status !== "countered") {
      return res.status(400).json({
        success: false,
        message: "You can only counter active bids",
      });
    }

    bid.amount = amount;
    bid.status = "countered";
    bid.lastOfferBy = "client";
    bid.negotiationHistory.push({
      amount,
      message,
      offeredBy: "client",
      timestamp: new Date(),
    });

    await bid.save();
    await bid.populate("freelancer", "name avatar bio skills averageRating");

    return res.status(200).json({
      success: true,
      message: "Counter-offer sent successfully",
      data: { bid },
    });

  } catch (error) {
    console.error("clientCounterOffer error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── FREELANCER RESPOND TO COUNTER ─────────────────────────────
const freelancerRespondToCounter = async (req, res) => {
  try {
    const validation = respondToCounterSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const { action, amount, message } = validation.data;

    const bid = await Bid.findById(req.params.id).populate("job");
    if (!bid) {
      return res.status(404).json({ success: false, message: "Bid not found" });
    }

    if (bid.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only respond to your own bids",
      });
    }

    if (bid.job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer open for negotiations",
      });
    }

    if (bid.status !== "countered" || bid.lastOfferBy !== "client") {
      return res.status(400).json({
        success: false,
        message: "No pending counter-offer to respond to",
      });
    }

    if (action === "accept") {
      // Add message to history
      if (message) {
        bid.negotiationHistory.push({
          amount: bid.amount,
          message,
          offeredBy: "freelancer",
          timestamp: new Date(),
        });
        await bid.save();
      }

      // Create contract automatically
      const result = await createContractFromBid(bid, bid.job.postedBy);
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to accept counter-offer. All changes have been rolled back.",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Counter-offer accepted! Contract created successfully.",
        data: { bid, contract: result.contract },
      });
    } else if (action === "counter") {
      bid.amount = amount;
      bid.lastOfferBy = "freelancer";
      bid.negotiationHistory.push({
        amount,
        message: message || "",
        offeredBy: "freelancer",
        timestamp: new Date(),
      });
    } else if (action === "reject") {
      bid.status = "rejected";
      bid.lastOfferBy = "freelancer";
      if (message) {
        bid.negotiationHistory.push({
          amount: bid.amount,
          message,
          offeredBy: "freelancer",
          timestamp: new Date(),
        });
      }
    }

    if (action !== "accept") {
      await bid.save();
      await bid.populate("freelancer", "name avatar bio skills averageRating");
      await bid.populate("job", "title budget status");

      return res.status(200).json({
        success: true,
        message: `Response "${action}" sent successfully`,
        data: { bid },
      });
    }

  } catch (error) {
    console.error("freelancerRespondToCounter error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET MY BIDS (Freelancer Dashboard) ──────────────────────
const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ freelancer: req.user._id })
      .populate("job", "title budget status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Your bids fetched successfully",
      data: { bids },
    });

  } catch (error) {
    console.error("getMyBids error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  submitBid,
  getBidsForJob,
  updateBidStatus,
  getMyBids,
  clientCounterOffer,
  freelancerRespondToCounter,
};
