const express = require("express");
const router = express.Router();

const {
  acceptBid,
  getContractById,
  getMyContracts,
  submitWork,
  releaseFunds,       // ← ADD
  requestRevision,    // ← ADD
} = require("../controllers/contractController");

const { protect, restrictTo } = require("../middlewares/authMiddleware");
const { upload } = require("../middlewares/uploadMiddleware");

// GET /api/contracts/my-contracts
router.get("/my-contracts", protect, getMyContracts);

// POST /api/contracts/accept-bid/:bidId
router.post("/accept-bid/:bidId", protect, restrictTo("client"), acceptBid);

// POST /api/contracts/:id/submit (freelancer uploads work)
router.post(
  "/:id/submit",
  protect,
  restrictTo("freelancer"),
  upload.single("workFile"),
  submitWork
);

/*
 * POST /api/contracts/:id/release
 * Client releases funds → triggers ACID transaction
 */
router.post("/:id/release", protect, restrictTo("client"), releaseFunds);

/*
 * POST /api/contracts/:id/revision
 * Client requests revision → sends work back to freelancer
 */
router.post("/:id/revision", protect, restrictTo("client"), requestRevision);

// GET /api/contracts/:id
router.get("/:id", protect, getContractById);

module.exports = router;