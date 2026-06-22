// What is Router()?

// Router() creates a mini Express application that is only responsible for handling routes.

const express = require("express");
const router = express.Router();

const { getPublicProfile, updateProfile } = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");

/*
 * ROUTE 1: GET /api/users/:id
 * Public — no protect middleware needed.
 * :id is a URL parameter that changes per request.
 * Example: /api/users/64abc123
 */
router.get("/:id", getPublicProfile);

/*
 * ROUTE 2: PUT /api/users/profile
 * Private — protect middleware runs FIRST.
 * Flow: Request → protect() checks JWT → updateProfile() runs
 */
router.put("/profile", protect, updateProfile);

module.exports = router;