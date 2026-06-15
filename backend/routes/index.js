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
const router = express.Router();

//Health check
router.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server Is Running",
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

//Features routes 
router.use("/auth", require("./authRoutes"));


// More routes added here as we build features:
// router.use("/jobs", require("./jobRoutes"));
// router.use("/bids", require("./bidRoutes"));
// router.use("/contracts", require("./contractRoutes"));
// router.use("/payments", request("./paymentRoutes"));
// router.use("/reviews", require("./reviewRoutes"));
// router.use("/admin", require("./adminRoutes"));

module.exports = router;
