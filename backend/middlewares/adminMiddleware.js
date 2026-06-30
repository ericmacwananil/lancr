/*
 * WHAT IS THIS FILE?
 * A middleware that checks if the logged-in user is an admin.
 *
 * Used after protect middleware — so we know req.user exists.
 *
 * Route protection chain:
 * Request → protect() → isAdmin() → controller()
 *
 * protect() checks: "Are you logged in?"
 * isAdmin() checks: "Are you an admin?"
 *
 * Both must pass before the admin controller runs.
 */

const isAdmin = (req, res, next) => {
  /*
   * req.user is set by protect middleware.
   * If role is not "admin" → reject immediately with 403 Forbidden.
   * 403 = "I know who you are, but you're not allowed here."
   * (vs 401 = "I don't know who you are at all")
   */
  if (req.user && req.user.role === "admin") {
    next(); // user is admin → continue to controller
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
};

module.exports = { isAdmin };