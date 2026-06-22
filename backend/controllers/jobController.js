const Job = require("../models/Job");
const { createJobSchema, updateJobSchema } = require("../validators/jobValidators");

/*
 * WHAT IS THIS FILE?
 * Contains all the business logic for jobs:
 * - createJob    → client posts a new job
 * - getAllJobs   → everyone sees open jobs feed
 * - getJobById  → see full details of one job
 * - updateJob   → client edits their job
 * - deleteJob   → client removes their job
 */


// ─── CREATE JOB ───────────────────────────────────────────────
/*
 * @route   POST /api/jobs
 * @access  Private — Client only
 */
const createJob = async (req, res) => {
  try {
    // Step 1: Validate incoming data
    const validation = createJobSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const { title, description, budget, skillsRequired } = validation.data;

    /*
     * Step 2: Create the job.
     * postedBy is set to req.user._id — the logged-in client's ID.
     * This comes from the protect middleware that ran before this controller.
     * So the client can ONLY post jobs as themselves, never as someone else.
     */
    const job = await Job.create({
      title,
      description,
      budget,
      skillsRequired,
      postedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: { job },
    });

  } catch (error) {
    console.error("createJob error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET ALL JOBS ─────────────────────────────────────────────
/*
 * @route   GET /api/jobs
 * @access  Public
 *
 * This is the main job feed that freelancers browse.
 * We support filtering and searching via query params:
 * Example: GET /api/jobs?status=open&search=react&page=2
 */
const getAllJobs = async (req, res) => {
  try {
    /*
     * req.query contains URL query parameters.
     * Example URL: /api/jobs?status=open&search=react&page=1&limit=10
     * req.query = { status: "open", search: "react", page: "1", limit: "10" }
     */
    const {
      status = "open",   // default: show only open jobs
      search = "",       // search by title keyword
      page = 1,          // current page number (for pagination)
      limit = 10,        // jobs per page
    } = req.query;

    /*
     * Build the MongoDB filter object dynamically.
     * We only add filters that were actually requested.
     */
    const filter = {};

    // Filter by status if provided
    if (status) filter.status = status;

    /*
     * Search by title using a regex (regular expression).
     * $regex: search → finds titles containing the search word.
     * $options: "i" → case-insensitive (React = react = REACT)
     */
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    /*
     * Pagination math:
     * Page 1: skip 0 items  (0 * 10 = 0)
     * Page 2: skip 10 items (1 * 10 = 10)
     * Page 3: skip 20 items (2 * 10 = 20)
     * Number() converts string "1" to number 1
     */
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    /*
     * Run two queries at the same time with Promise.all():
     * 1. Get the jobs for current page
     * 2. Count total matching jobs (for frontend pagination)
     *
     * .populate("postedBy", "name avatar") replaces the postedBy ID
     * with the actual user's name and avatar only.
     * .sort({ createdAt: -1 }) → newest jobs first (-1 = descending)
     */
    const [jobs, totalJobs] = await Promise.all([
      Job.find(filter)
        .populate("postedBy", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Job.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      data: {
        jobs,
        pagination: {
          total: totalJobs,
          page: pageNum,
          pages: Math.ceil(totalJobs / limitNum), // total number of pages
          limit: limitNum,
        },
      },
    });

  } catch (error) {
    console.error("getAllJobs error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── GET JOB BY ID ────────────────────────────────────────────
/*
 * @route   GET /api/jobs/:id
 * @access  Public
 */
const getJobById = async (req, res) => {
  try {
    /*
     * Find job by ID from URL params.
     * Populate both postedBy and assignedTo with basic user info.
     */
    const job = await Job.findById(req.params.id)
      .populate("postedBy", "name avatar bio averageRating")
      .populate("assignedTo", "name avatar");

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job fetched successfully",
      data: { job },
    });

  } catch (error) {
    console.error("getJobById error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── UPDATE JOB ───────────────────────────────────────────────
/*
 * @route   PUT /api/jobs/:id
 * @access  Private — Client only (must be the owner)
 */
const updateJob = async (req, res) => {
  try {
    // Step 1: Validate
    const validation = updateJobSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message);
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    // Step 2: Find the job
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    /*
     * Step 3: Ownership check.
     * Only the client who posted the job can update it.
     * job.postedBy is a MongoDB ObjectId.
     * req.user._id is also an ObjectId.
     * .toString() converts both to strings for comparison.
     */
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own jobs",
      });
    }

    // Step 4: Only allow editing if job is still open
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a job that is already assigned or completed",
      });
    }

    // Step 5: Update
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: validation.data },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: { job: updatedJob },
    });

  } catch (error) {
    console.error("updateJob error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── DELETE JOB ───────────────────────────────────────────────
/*
 * @route   DELETE /api/jobs/:id
 * @access  Private — Client only (must be the owner)
 */
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Ownership check
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own jobs",
      });
    }

    // Don't allow deleting assigned/active jobs
    if (["assigned", "under_review"].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a job that is currently active",
      });
    }

    await Job.findByIdAndDelete(req.params.id);

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


// ─── GET MY JOBS (Client Dashboard) ──────────────────────────
/*
 * @route   GET /api/jobs/my-jobs
 * @access  Private — Client only
 *
 * Returns only the jobs posted by the logged-in client.
 * Used in the ClientDashboard page.
 */
const getMyJobs = async (req, res) => {
  try {
    /*
     * Filter jobs where postedBy matches the logged-in user's ID.
     * This ensures clients only see THEIR OWN jobs.
     */
    const jobs = await Job.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name avatar");

    return res.status(200).json({
      success: true,
      message: "Your jobs fetched successfully",
      data: { jobs },
    });

  } catch (error) {
    console.error("getMyJobs error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
};