const express = require("express");
/*
 * express.Router() creates a mini-application that can handle
 * its own routes. We mount this on "/api/auth" in index.js.
 * So router.post("/login") becomes POST /api/auth/login
 */
const router = express.Router();

const { register, login, logout, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

// Public routes — no login required
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Private route — protect middleware runs first
// Flow: request → protect() → if valid → getMe()
router.get("/me", protect, getMe);

module.exports = router;





// server.js
// app.use("/api", routes)
//         ↓

// routes/index.js
// router.use("/auth", authRoutes)
//         ↓

// authRoutes.js
// router.post("/login", login)