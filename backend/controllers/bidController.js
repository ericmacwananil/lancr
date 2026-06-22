const Bid = require("../models/Bid");
const Job = require("../models/Job");
const { submitBidSchema, updateBidStatusSchema } = require("../validators/bidValidators");

/*
 * WHAT IS THIS FILE?
 * Business logic for all bid operations:
 * 1. submitBid      → freelancer places a bid on a job
 * 2. getBidsForJob  → get all bids on a specific job
 * 3. updateBidStatus → client accepts or rejects a bid
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
      const errors = validation.error.errors.map((e) => e.message);
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
    /*
     * Only "open" jobs can receive bids.
     * If status is "assigned" or "completed", bidding is closed.
     */
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer accepting bids",
      });
    }

    // Step 4: Prevent client from bidding on their own job
    /*
     * job.postedBy is the client's ID.
     * req.user._id is the logged-in freelancer's ID.
     * If they match, the client is trying to bid on their own job.
     */
    if (job.postedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot bid on your own job",
      });
    }

    // Step 5: Create the bid
    /*
     * If the freelancer already bid on this job, MongoDB will throw
     * a duplicate key error (code 11000) because of our compound
     * unique index in Bid.js. Our errorHandler catches this
     * and returns "job already exists" message automatically.
     *
     * But let's give a more specific message by checking first:
     */
    const existingBid = await Bid.findOne({
      job: jobId,
      freelancer: req.user._id,
    });

    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: "You have already placed a bid on this job",
      });
    }

    // Step 6: Save the bid
    const bid = await Bid.create({
      job: jobId,
      freelancer: req.user._id, // logged-in freelancer's ID
      amount,
      coverLetter,
    });

    /*
     * Populate the freelancer field so the response includes
     * the freelancer's name and avatar, not just their ID.
     */
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
/*
 * @route   GET /api/bids/job/:jobId
 * @access  Private — Only the client who posted the job
 *
 * Returns all bids placed on a specific job.
 * Only the job OWNER (client) should see the bids.
 */
const getBidsForJob = async (req, res) => {
  try {
    // Step 1: Find the job to verify ownership
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Step 2: Ownership check — only the client who posted can see bids
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view bids on your own jobs",
      });
    }

    // Step 3: Fetch all bids for this job
    /*
     * .populate("freelancer", "name avatar bio skills averageRating")
     * replaces the freelancer ID with the actual user data.
     * "name avatar bio skills averageRating" = only these fields
     * (space separated, no commas needed).
     *
     * .sort({ createdAt: -1 }) → newest bids first
     */
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
/*
 * @route   PUT /api/bids/:id/status
 * @access  Private — Client only (must own the job)
 *
 * When client accepts a bid:
 * → In Feature 6, this will trigger the ACID Transaction
 *   to create a Contract. For now, we just update the status.
 *
 * When client rejects a bid:
 * → Just mark that bid as rejected.
 */
const updateBidStatus = async (req, res) => {
  try {
    // Step 1: Validate the incoming status
    const validation = updateBidStatusSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const { status } = validation.data;

    // Step 2: Find the bid and populate its job
    /*
     * We populate "job" here because we need to:
     * 1. Check if the logged-in client owns the job
     * 2. Check the job's current status
     */
    const bid = await Bid.findById(req.params.id).populate("job");
    if (!bid) {
      return res.status(404).json({ success: false, message: "Bid not found" });
    }

    // Step 3: Verify the logged-in user owns the job this bid is for
    if (bid.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only manage bids on your own jobs",
      });
    }

    // Step 4: Prevent accepting a bid on a non-open job
    if (bid.job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer open for bid acceptance",
      });
    }

    // Step 5: Prevent updating an already decided bid
    if (bid.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This bid has already been ${bid.status}`,
      });
    }

    // Step 6: Update the bid status
    bid.status = status;
    await bid.save();

    /*
     * NOTE FOR FEATURE 6:
     * When status === "accepted", this is where we will trigger
     * the MongoDB ACID Transaction to:
     * 1. Create a Contract
     * 2. Update Job status to "assigned"
     * 3. Reject all other pending bids for this job
     *
     * For now, we just save the bid status.
     */

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


// ─── GET MY BIDS (Freelancer Dashboard) ──────────────────────
/*
 * @route   GET /api/bids/my-bids
 * @access  Private — Freelancer only
 *
 * Returns all bids placed by the logged-in freelancer.
 * Useful for a freelancer to track their bid history.
 */
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


module.exports = { submitBid, getBidsForJob, updateBidStatus, getMyBids };