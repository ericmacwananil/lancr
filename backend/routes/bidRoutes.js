const express = require("express");
const router = express.Router();

const {
  submitBid,
  getBidsForJob,
  updateBidStatus,
  getMyBids,
  clientCounterOffer,
  freelancerRespondToCounter,
} = require("../controllers/bidController");

const { protect, restrictTo } = require("../middlewares/authMiddleware");

/*
 * ALL bid routes are private — you must be logged in.
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

router.post(
  "/:id/counter-offer",
  protect,
  restrictTo("client"),
  clientCounterOffer
);

router.post(
  "/:id/respond",
  protect,
  restrictTo("freelancer"),
  freelancerRespondToCounter
);

module.exports = router;