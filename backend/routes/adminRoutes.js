const express = require("express");
const router = express.Router();

const {
  getStats,
  getAllUsers,
  getAllJobs,
  getAllContracts,
  deleteUser,
  deleteJob,
} = require("../controllers/adminController");

const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

/*
 * ALL admin routes use BOTH middlewares:
 * 1. protect  → must be logged in (has valid JWT)
 * 2. isAdmin  → must have role === "admin"
 *
 * A regular client/freelancer hitting these routes
 * will be stopped at isAdmin and get 403.
 */

router.get("/stats",     protect, isAdmin, getStats);
router.get("/users",     protect, isAdmin, getAllUsers);
router.get("/jobs",      protect, isAdmin, getAllJobs);
router.get("/contracts", protect, isAdmin, getAllContracts);
router.delete("/users/:id", protect, isAdmin, deleteUser);
router.delete("/jobs/:id",  protect, isAdmin, deleteJob);

module.exports = router;