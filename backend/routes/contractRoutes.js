const express = require("express");
const router = express.Router();

const {
  acceptBid,
  getContractById,
  getMyContracts,
  submitWork,             // ← ADD
} = require("../controllers/contractController");

const { protect, restrictTo } = require("../middlewares/authMiddleware");
const { upload } = require("../middlewares/uploadMiddleware"); // ← ADD

// GET /api/contracts/my-contracts
router.get("/my-contracts", protect, getMyContracts);

// POST /api/contracts/accept-bid/:bidId
router.post("/accept-bid/:bidId", protect, restrictTo("client"), acceptBid);

/*
 * POST /api/contracts/:id/submit
 *
 * Middleware chain (runs left to right):
 * 1. protect          → check if user is logged in
 * 2. restrictTo       → check if user is a freelancer
 * 3. upload.single()  → read the file from request, upload to Cloudinary
 * 4. submitWork       → save Cloudinary URL to DB, update status
 *
 * "workFile" must match the field name used in the frontend form.
 * If frontend sends file as "workFile", this matches.
 * If names don't match, req.file will be undefined.
 */
router.post(
  "/:id/submit",
  protect,
  restrictTo("freelancer"),
  upload.single("workFile"),
  submitWork
);

// GET /api/contracts/:id
router.get("/:id", protect, getContractById);

module.exports = router;