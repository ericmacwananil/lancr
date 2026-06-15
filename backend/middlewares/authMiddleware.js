const jwt = require("jsonwebtoken");
const User = require("../models/User");

/*
 * WHY MIDDLEWARE?
 * Middleware is a function that runs BETWEEN the request arriving
 * and the controller handling it. Think of it as a checkpoint.
 *
 * The protect middleware answers: "Is this user logged in?"
 * If yes → pass them through to the controller (next())
 * If no → send back a 401 Unauthorized error immediately
 *
 * We'll use this on any route that requires login, like:
 * router.post("/jobs", protect, createJob)
 */

const protect = async (req, res, next) => {
  try {
    /*
     * Read the JWT from the cookie.
     * req.cookies is available because we use cookieParser() in server.js
     */
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }

    /*
     * jwt.verify() decodes and validates the token.
     * If the token is tampered with or expired, it throws an error
     * which gets caught by our errorHandler middleware.
     *
     * decoded will look like: { id: "user_mongo_id", iat: ..., exp: ... }
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /*
     * Fetch the user from DB using the ID stored in the token.
     * We use .select("-password") to make sure the password
     * is never attached to req.user — extra safety layer.
     */
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    /*
     * Attach the user to the request object.
     * Now any controller that comes after can access req.user
     * to know WHO is making the request.
     */
    req.user = user;
    next(); // pass control to the next middleware/controller

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Token invalid or expired.",
    });
  }
};

/*
 * ROLE MIDDLEWARE (restrictTo)
 * Used to restrict certain routes to specific roles.
 *
 * Usage example:
 * router.post("/jobs", protect, restrictTo("client"), createJob)
 *
 * This means: user must be logged in AND must be a client.
 * A freelancer hitting this route gets a 403 Forbidden.
 *
 * ...roles uses "rest parameters" — it collects all arguments
 * into an array. So restrictTo("client", "admin") works too.
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Only ${roles.join(", ")} can perform this action.`,
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };