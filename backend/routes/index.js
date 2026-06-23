// First: What is the routes/ folder?
// The routes/ folder contains all the URLs of your application.

// Think like this 👇
// =authRoutes.js
// -login
// -register

// and
// =index.js
// -/auth + authRoutes

// so
// Final system:
// /auth/login
// /auth/register




// STEP BY STEP FLOW

// REQUEST IS /AUTH/LOGIN

// Request comes to server
//         ↓
// routes/index.js checks prefix
//         ↓
// /auth matched
//         ↓
// authRoutes.js activated
//         ↓
// /login route inside authRoutes
//         ↓
// loginUser controller runs
//         ↓
// Response sent




//MY UNDERSTANDING - SO IN INDEX.JS WE DESCRIBE ALL PREFIX ROUTE, SO ID ANY REQUEST
// LIKE AUTH/LOGIN COMES SO FIRST INDEX.JS RUNS IN THAT THERE IS router.use("/auth", require("./authRoutes"));
// THEN IT WILL SELECT /LOGIN ROUTE FROM  AUTHROUTES ROUTE, SO IT BECAME /AUTH/LOGIN




const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

/*
 * Enhanced /health route.
 * Returns server status + MongoDB connection state.
 * Used by Render/Railway to check if the app is alive.
 * Also useful for debugging production issues.
 *
 * MongoDB connection states:
 * 0 = disconnected
 * 1 = connected ✅
 * 2 = connecting
 * 3 = disconnecting
 */
router.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  }[dbState] || "unknown";

  res.status(200).json({
    success: true,
    message: "Server is running",
    server: "online",
    database: dbStatus,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`, // how long server has been running
  });
});

router.use("/auth",      require("./authRoutes"));
router.use("/users",     require("./userRoutes"));
router.use("/jobs",      require("./jobRoutes"));
router.use("/bids",      require("./bidRoutes"));
router.use("/contracts", require("./contractRoutes"));
router.use("/payments",  require("./paymentRoutes"));
router.use("/reviews",   require("./reviewRoutes"));
router.use("/admin",     require("./adminRoutes"));

module.exports = router;