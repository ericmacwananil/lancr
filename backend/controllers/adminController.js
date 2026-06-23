const User = require("../models/User");
const Job = require("../models/Job");
const Contract = require("../models/Contract");

/*
 * WHAT IS THIS FILE?
 * Admin-only controllers that give full platform visibility.
 * Regular users NEVER have access to these endpoints.
 *
 * Controllers:
 * 1. getStats        → platform overview numbers
 * 2. getAllUsers      → see all registered users
 * 3. getAllJobs       → see all jobs on the platform
 * 4. getAllContracts  → see all contracts
 * 5. deleteUser      → remove a user
 * 6. deleteJob       → remove a job
 */


// ─── GET PLATFORM STATS ───────────────────────────────────────
/*
 * @route   GET /api/admin/stats
 * @access  Admin only
 *
 * Returns overview numbers for the dashboard header.
 * Promise.all() runs all queries at the SAME TIME (parallel).
 * Much faster than running them one after another (sequential).
 *
 * Sequential:   query1 → 200ms → query2 → 200ms → total: 400ms
 * Parallel:     query1 + query2 at same time → total: 200ms
 */
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalJobs,
      activeJobs,
      totalContracts,
      completedContracts,
      /*
       * aggregate() runs MongoDB aggregation pipeline.
       * $match: filter completed contracts only.
       * $group: group all into one document.
       * $sum: add up all agreedAmount values.
       * Result: [{ _id: null, totalEarnings: 12500 }]
       */
      earningsResult,
    ] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ status: "open" }),
      Contract.countDocuments(),
      Contract.countDocuments({ status: "completed" }),
      Contract.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, totalEarnings: { $sum: "$agreedAmount" } } },
      ]),
    ]);

    const totalEarningsReleased = earningsResult[0]?.totalEarnings || 0;

    return res.status(200).json({
      success: true,
      message: "Stats fetched successfully",
      data: {
        totalUsers,
        totalJobs,
        activeJobs,
        totalContracts,
        completedContracts,
        totalEarningsReleased,
      },
    });

  } catch (error) {
    console.error("getStats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET ALL USERS ────────────────────────────────────────────
/*
 * @route   GET /api/admin/users
 * @access  Admin only
 */
const getAllUsers = async (req, res) => {
  try {
    /*
     * Get all users but EXCLUDE passwords.
     * select("-password") = give me everything EXCEPT password.
     * sort by newest first.
     */
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: { users, total: users.length },
    });

  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET ALL JOBS ─────────────────────────────────────────────
/*
 * @route   GET /api/admin/jobs
 * @access  Admin only
 */
const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("postedBy", "name email") // show who posted
      .populate("assignedTo", "name email") // show who is assigned
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      data: { jobs, total: jobs.length },
    });

  } catch (error) {
    console.error("getAllJobs error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET ALL CONTRACTS ────────────────────────────────────────
/*
 * @route   GET /api/admin/contracts
 * @access  Admin only
 */
const getAllContracts = async (req, res) => {
  try {
    const contracts = await Contract.find()
      .populate("job", "title budget")
      .populate("client", "name email")
      .populate("freelancer", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Contracts fetched successfully",
      data: { contracts, total: contracts.length },
    });

  } catch (error) {
    console.error("getAllContracts error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── DELETE USER ──────────────────────────────────────────────
/*
 * @route   DELETE /api/admin/users/:id
 * @access  Admin only
 *
 * Prevents admin from deleting themselves accidentally.
 */
const deleteUser = async (req, res) => {
  try {
    // Prevent admin from deleting their own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: {},
    });

  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── DELETE JOB ───────────────────────────────────────────────
/*
 * @route   DELETE /api/admin/jobs/:id
 * @access  Admin only
 */
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
      data: {},
    });

  } catch (error) {
    console.error("deleteJob error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  getStats,
  getAllUsers,
  getAllJobs,
  getAllContracts,
  deleteUser,
  deleteJob,
};