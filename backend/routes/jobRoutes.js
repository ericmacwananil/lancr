const express = require("express");
const router = express.Router();

const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
} = require("../controllers/jobController");

const { protect, restrictTo } = require("../middlewares/authMiddleware");

/*
 * ROUTE ORDER MATTERS IN EXPRESS!
 *
 * /my-jobs must come BEFORE /:id
 * Because Express reads routes top to bottom.
 * If /:id comes first, Express will treat "my-jobs"
 * as an ID and try to find a job with id="my-jobs" → wrong!
 */

// GET /api/jobs/my-jobs → client's own jobs (protected)
router.get("/my-jobs", protect, restrictTo("client"), getMyJobs);

// GET /api/jobs → public job feed
router.get("/", getAllJobs);

// POST /api/jobs → create job (client only)
router.post("/", protect, restrictTo("client"), createJob);

// GET /api/jobs/:id → single job detail
router.get("/:id", getJobById);

// PUT /api/jobs/:id → update job (client only)
router.put("/:id", protect, restrictTo("client"), updateJob);

// DELETE /api/jobs/:id → delete job (client only)
router.delete("/:id", protect, restrictTo("client"), deleteJob);

module.exports = router;