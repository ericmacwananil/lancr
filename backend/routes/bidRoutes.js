const express = require("express");
const router = express.Router();

const {
  submitBid,
  getBidsForJob,
  updateBidStatus,
  getMyBids,
} = require("../controllers/bidController");

const { protect, restrictTo } = require("../middlewares/authMiddleware");

/*
 * ALL bid routes are private — you must be logged in.
 *
 * GET /api/bids/my-bids         → freelancer sees their own bids
 * POST /api/bids                → freelancer submits a bid
 * GET /api/bids/job/:jobId      → client sees all bids on their job
 * PUT /api/bids/:id/status      → client accepts or rejects a bid
 *
 * NOTE: my-bids must come BEFORE :id routes
 * (same reason as in jobRoutes — Express reads top to bottom)
 */

router.get(
  "/my-bids",
  protect,
  restrictTo("freelancer"),
  getMyBids
);

router.post(
  "/",
  protect,
  restrictTo("freelancer"),
  submitBid
);

router.get(
  "/job/:jobId",
  protect,
  restrictTo("client"),
  getBidsForJob
);

router.put(
  "/:id/status",
  protect,
  restrictTo("client"),
  updateBidStatus
);

module.exports = router;