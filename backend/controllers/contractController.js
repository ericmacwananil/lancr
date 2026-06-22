const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const Bid = require("../models/Bid");
const Job = require("../models/Job");

/*
 * WHAT IS THIS FILE?
 * The most important controller in the whole project.
 *
 * acceptBid uses a MongoDB ACID Transaction to safely
 * create a contract when a client accepts a freelancer's bid.
 *
 * WHY mongoose AND NOT just Contract.create()?
 * We import mongoose (not just the models) because
 * mongoose.startSession() is how we begin a transaction.
 * The session is like a "safety bubble" around our operations.
 */


// ─── ACCEPT BID (ACID TRANSACTION) ───────────────────────────
/*
 * @route   POST /api/contracts/accept-bid/:bidId
 * @access  Private — Client only
 *
 * WHAT HAPPENS WHEN CLIENT CLICKS "ACCEPT BID":
 * Step 1: Find the bid and validate it
 * Step 2: Start a MongoDB session (opens the safety bubble)
 * Step 3: Inside the transaction, do ALL 4 operations:
 *   a) Create a Contract
 *   b) Update Bid status → "accepted"
 *   c) Update Job status → "assigned"
 *   d) Set Job.assignedTo → freelancer's ID
 * Step 4: If ALL succeed → commit (save permanently)
 *         If ANY fail    → abort (undo everything)
 * Step 5: End the session (close the safety bubble)
 */
const acceptBid = async (req, res) => {
  /*
   * We declare 'session' outside the try-catch so we can
   * access it in the finally block to always end it,
   * even if an error occurs.
   */
  let session = null;

  try {
    // ── Step 1: Find and validate the bid ─────────────────
    const bid = await Bid.findById(req.params.bidId).populate("job");

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      });
    }

    /*
     * Security checks BEFORE starting the transaction.
     * We check these early to avoid starting an unnecessary session.
     */

    // Only the client who posted the job can accept a bid
    if (bid.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only accept bids on your own jobs",
      });
    }

    // Can only accept a PENDING bid
    if (bid.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This bid has already been ${bid.status}`,
      });
    }

    // Can only accept a bid on an OPEN job
    if (bid.job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer open",
      });
    }

    // ── Step 2: Start the MongoDB Session ─────────────────
    /*
     * WHAT IS A SESSION?
     * Think of it like a shopping cart at a checkout counter.
     * All your items go into the cart (session).
     * Only when you confirm payment (commitTransaction)
     * do the items actually leave the store.
     * If you change your mind (abortTransaction),
     * everything goes back on the shelf.
     *
     * mongoose.startSession() creates this "cart".
     */
    session = await mongoose.startSession();

    /*
     * WHAT IS withTransaction()?
     * It's a helper that:
     * 1. Automatically calls session.startTransaction()
     * 2. Runs our callback function
     * 3. If callback succeeds → calls commitTransaction() automatically
     * 4. If callback throws error → calls abortTransaction() automatically
     *
     * We put ALL 4 database operations inside this callback.
     */
    let newContract = null; // we'll store the contract here to return it

    await session.withTransaction(async () => {

      // ── Operation A: Create the Contract ────────────────
      /*
       * IMPORTANT: Notice we pass { session } to every operation.
       * This is how MongoDB knows these operations are part of
       * the SAME transaction. Without { session }, each operation
       * would be independent and ACID wouldn't work.
       *
       * Contract.create() normally returns one document.
       * But when used with a session, it returns an ARRAY.
       * That's why we destructure: const [contract] = await Contract.create(...)
       */
      const [contract] = await Contract.create(
        [
          {
            job: bid.job._id,
            client: req.user._id,       // logged-in client
            freelancer: bid.freelancer,  // freelancer from the bid
            agreedAmount: bid.amount,    // the bid amount (not job budget)
          },
        ],
        { session } // ← CRITICAL: links this to our transaction
      );

      newContract = contract; // save for the response

      // ── Operation B: Update Bid status → "accepted" ─────
      /*
       * findByIdAndUpdate with { session } = part of transaction.
       * If this fails, Operation A (create contract) is undone.
       */
      await Bid.findByIdAndUpdate(
        bid._id,
        { $set: { status: "accepted" } },
        { session } // ← CRITICAL
      );

      // ── Operation C: Update Job status → "assigned" ─────
      /*
       * $set updates only the specified fields.
       * Other job fields (title, description, etc.) are untouched.
       */
      await Job.findByIdAndUpdate(
        bid.job._id,
        {
          $set: {
            status: "assigned",          // job is now taken
            assignedTo: bid.freelancer,  // who is working on it
          },
        },
        { session } // ← CRITICAL
      );

      // ── Operation D: Reject all other pending bids ──────
      /*
       * updateMany updates MULTIPLE documents at once.
       *
       * Find all bids where:
       * - job matches this job (_id: bid.job._id)
       * - bid is NOT the accepted one (_id: { $ne: bid._id })
       *   ($ne = "not equal")
       * - bid is still pending
       *
       * Set all their statuses to "rejected".
       * This is fair — once one bid is accepted,
       * other freelancers should know their bid lost.
       */
      await Bid.updateMany(
        {
          job: bid.job._id,
          _id: { $ne: bid._id },  // all bids EXCEPT the accepted one
          status: "pending",
        },
        { $set: { status: "rejected" } },
        { session } // ← CRITICAL
      );

      /*
       * If we reach here, ALL 4 operations succeeded.
       * withTransaction() will now call commitTransaction()
       * and all changes are permanently saved to MongoDB.
       *
       * If ANY operation above threw an error,
       * withTransaction() would call abortTransaction()
       * and ALL changes would be rolled back (undone).
       * The DB stays clean and consistent.
       */
    });

    // ── Step 3: Transaction complete, send response ────────
    /*
     * Populate the contract with full details for the response.
     * The client's frontend needs this to navigate to
     * the ContractDetailPage.
     */
    const populatedContract = await Contract.findById(newContract._id)
      .populate("job", "title description budget")
      .populate("client", "name email avatar")
      .populate("freelancer", "name email avatar skills");

    return res.status(201).json({
      success: true,
      message: "Bid accepted! Contract created successfully.",
      data: { contract: populatedContract },
    });

  } catch (error) {
    /*
     * If ANY error happens (network, DB, validation, etc.),
     * withTransaction() already aborted the transaction.
     * We just log and send an error response here.
     */
    console.error("acceptBid ACID transaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept bid. All changes have been rolled back.",
    });

  } finally {
    /*
     * ALWAYS end the session, whether success or error.
     * Like closing a database connection — must always be cleaned up.
     * 'finally' runs no matter what happens in try/catch.
     */
    if (session) {
      await session.endSession();
    }
  }
};


// ─── GET CONTRACT BY ID ───────────────────────────────────────
/*
 * @route   GET /api/contracts/:id
 * @access  Private — Client or Freelancer on this contract
 */
const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("job", "title description budget status")
      .populate("client", "name email avatar")
      .populate("freelancer", "name email avatar skills bio");

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    /*
     * Security: only the client or freelancer on THIS contract
     * can view it. Not other users.
     */
    const isClient = contract.client._id.toString() === req.user._id.toString();
    const isFreelancer = contract.freelancer._id.toString() === req.user._id.toString();

    if (!isClient && !isFreelancer) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this contract",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contract fetched successfully",
      data: { contract },
    });

  } catch (error) {
    console.error("getContractById error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET MY CONTRACTS ─────────────────────────────────────────
/*
 * @route   GET /api/contracts/my-contracts
 * @access  Private — Client or Freelancer
 *
 * Returns contracts where the logged-in user is
 * either the client OR the freelancer.
 */
const getMyContracts = async (req, res) => {
  try {
    /*
     * $or operator: find documents where EITHER condition is true.
     * Find contracts where:
     * - client === logged in user   (they hired someone)
     * OR
     * - freelancer === logged in user (they were hired)
     */
    const contracts = await Contract.find({
      $or: [
        { client: req.user._id },
        { freelancer: req.user._id },
      ],
    })
      .populate("job", "title budget")
      .populate("client", "name avatar")
      .populate("freelancer", "name avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Contracts fetched successfully",
      data: { contracts },
    });

  } catch (error) {
    console.error("getMyContracts error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── SUBMIT WORK ──────────────────────────────────────────────
/*
 * @route   POST /api/contracts/:id/submit
 * @access  Private — Freelancer only
 *
 * WHAT HAPPENS:
 * 1. Multer middleware already ran before this controller.
 *    The file is already uploaded to Cloudinary.
 *    req.file.path = the Cloudinary URL.
 * 2. We just save that URL to the contract and update status.
 *
 * NOTE: No ACID transaction needed here.
 * Only one document (Contract) is being updated.
 * Single document updates are atomic by default in MongoDB.
 */
const submitWork = async (req, res) => {
  try {
    // Step 1: Find the contract
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Step 2: Only the assigned freelancer can submit work
    if (contract.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned freelancer can submit work",
      });
    }

    // Step 3: Can only submit if contract is "funded"
    /*
     * funded = client has paid, freelancer can work and submit.
     * If still "pending_payment" → client hasn't paid yet.
     * If "under_review" → already submitted, can't submit again.
     * If "completed" → job is done, too late.
     */
    if (contract.status !== "funded") {
      return res.status(400).json({
        success: false,
        message: `Cannot submit work. Contract status is: ${contract.status}`,
      });
    }

    // Step 4: Check if a file was uploaded
    /*
     * req.file is set by Multer middleware (uploadMiddleware.js).
     * If no file was attached to the request, req.file is undefined.
     */
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a work file",
      });
    }

    /*
     * Step 5: Update the contract.
     *
     * req.file.path = the Cloudinary URL of the uploaded file.
     * Example: "https://res.cloudinary.com/your-cloud/image/upload/v123/freelance-marketplace/submissions/abc123.pdf"
     *
     * We also save an optional note if the freelancer included one.
     */
    contract.deliveryFile = req.file.path;    // Cloudinary URL
    contract.status = "under_review";          // client needs to review
    await contract.save();

    return res.status(200).json({
      success: true,
      message: "Work submitted successfully! Waiting for client review.",
      data: { contract },
    });

  } catch (error) {
    console.error("submitWork error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during work submission",
    });
  }
};


module.exports = { acceptBid, getContractById, getMyContracts, submitWork };