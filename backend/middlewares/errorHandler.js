// middleware function run between req to route
//flow
//Client Request
    //   ↓
// Middleware
//       ↓
// Route Controller
//       ↓
// Response

// Why use middleware?

// Instead of writing the same code in every route, you write it once in a middleware.

// Example: Authentication



// backend/middlewares/errorHandler.js

// Central error handler — all unhandled errors in any controller flow here.

// First: What Problem Does It Solve?

// Imagine this controller:

// const getUser = async (req, res) => {
//   const user = await User.findById(req.params.id);

//   res.json(user);
// };

// User sends:

// GET /users/123

// But 123 is not a valid MongoDB ObjectId.

// MongoDB throws an error:

// CastError

// Without an error handler:

// Server crashes
// OR
// Ugly error appears
// OR
// Request hangs

// Not professional.




const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 404;
    message = `Resource not found`;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired, please login again";
  }

  console.error(`[ERROR] ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;