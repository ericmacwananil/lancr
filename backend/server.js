// backend/server.js

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");


const connectDB = require("./config/db");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");

//connect to mongodb
connectDB();

const app = express();
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean),
    credentials: true,
  },
});

// Store online users (for demo purposes)
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // When a user comes online, store their user ID to socket ID mapping
  socket.on("userOnline", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("User online:", userId);
  });

  // Listen for new messages
  socket.on("sendMessage", async (data) => {
    // Emit the message to the recipient's socket (if online)
    const recipientSocketId = onlineUsers.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", data.message);
    }
    // Also emit to the conversation for anyone in it
    io.to(data.conversationId).emit("receiveMessage", data.message);
  });

  // Join a conversation room
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log("User joined conversation:", conversationId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Remove user from onlineUsers map
    for (let [userId, sockId] of onlineUsers) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

// Make io available in routes
app.set("io", io);

// helmet is a security middleware for Express.
// It automatically adds security headers to your HTTP responses to protect your backend from common attacks.
app.use(helmet());


// ─── CORS ────────────────────────────────────────────────────> Frontend ↔ Backend communication
/*
 * FIND the CORS section in server.js and REPLACE with this:
 * Now accepts BOTH localhost (dev) and Vercel URL (production).
 */
app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * allowedOrigins: all URLs allowed to call our API.
       * Add your Vercel URL here after deployment.
       */
      const allowedOrigins = [
        "http://localhost:5173",
        process.env.CLIENT_URL,
      ].filter(Boolean); // remove undefined/null values

      // Allow requests with no origin (Postman, mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

//Body parser
// NOTE: Stripe webhook needs raw body — we'll override this in paymentRoutes later
app.use((req, res, next) => {
  /*
   * If the request is for the Stripe webhook route,
   * skip express.json() and let the route handle it
   * with express.raw() instead.
   */
  if (req.originalUrl === "/api/payments/webhook") {
    next(); // skip JSON parsing for webhook
  } else {
    express.json()(req, res, next); // parse JSON for all other routes
  }
});
app.use(express.urlencoded({ extended: true }));


// cookieParser
// 🍪 Real-world Use Case (Login System)
// Step 1: User logs in

// Backend sets cookie:

// res.cookie("token", jwtToken, {
//   httpOnly: true,
//   secure: true
// });

// Step 2: Browser sends cookie automatically
// Cookie: token=eyJhbGciOiJI...
// Step 3: Backend reads cookie
// const token = req.cookies.token;

// Now you can:

// verify user
// check login
// allow access
app.use(cookieParser());


//logger (dev only)
// 🧠 Step-by-step breakdown
// 1. process.env.NODE_ENV

// This is an environment variable.

// It can be:

// development
// production
// test
// 2. Condition
// if (process.env.NODE_ENV === "development")

// Means:

// If we are developing the app locally...
// 3. morgan("dev")
// app.use(morgan("dev"));

// Morgan is a request logger middleware.

// It prints every API request in terminal.

// 📊 Example Output (Morgan)

// When someone calls:

// GET /api/users

// Terminal shows:

// GET /api/users 200 12ms
// 🚀 Why only in development?

// Because:

// Development mode
// ✔ Debugging
// ✔ See API requests
// ✔ Track errors easily
// Production mode
// ❌ No noisy logs
// ❌ Better performance
// ❌ Cleaner server logs
// 🧠 Simple Meaning

// 👉 “Show request logs only while building the app, not after deployment.”
if(process.env.NODE_ENV === "development"){
    app.use(morgan("dev"));
}

// “All routes inside routes will start with /api.”
// 🧠 Simple Meaning

// 👉 /api is a base prefix (common starting path)
// 👉 routes is your route file (index.js or router group)

// So everything inside routes becomes:

// /api/...
// ─── API Routes ───────────────────────────────────────────────
app.use("/api", routes);


// ─── 404 Handler ─────────────────────────────────────────────
// This is called a 404 middleware (Not Found handler).

// It runs when:
// No route matches the incoming request.
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// global error handler
app.use(errorHandler);


//Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server run on http://localhost:${PORT}`);
    console.log(`Environment = ${process.env.NODE_ENV}`);
});