const User = require("../models/User");
const { updateProfileSchema } = require("../validators/userValidators");

/*
 * WHAT IS THIS FILE?
 * This file has 2 functions (controllers):
 * 1. getPublicProfile → anyone can view a user's profile
 * 2. updateProfile    → only the logged-in user can update their own profile
 */


// ─── GET PUBLIC PROFILE ───────────────────────────────────────
/*
 * @route   GET /api/users/:id
 * @access  Public (no login needed)
 *
 * WHY PUBLIC?
 * When a client wants to see a freelancer's profile before
 * hiring them, they shouldn't need to be logged in.
 * Anyone can view a profile — like LinkedIn.
 *
 * req.params.id → the :id part from the URL
 * Example: GET /api/users/64abc123 → req.params.id = "64abc123"
 */
const getPublicProfile = async (req, res) => {
  try {
    /*
     * Find user by ID from the URL.
     * .select("-password") → never send password to frontend,
     * even though it's hashed.
     */
    const user = await User.findById(req.params.id).select("-password");

    // If no user found with that ID, send 404
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: { user },
    });

  } catch (error) {
    console.error("getPublicProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};


// ─── UPDATE PROFILE ───────────────────────────────────────────
/*
 * @route   PUT /api/users/profile
 * @access  Private (must be logged in)
 *
 * HOW DO WE KNOW WHICH USER TO UPDATE?
 * The protect middleware (authMiddleware.js) already ran
 * before this function. It verified the JWT cookie and
 * attached the user to req.user.
 * So we use req.user._id to find and update THEIR profile.
 * A user can ONLY update their own profile, never someone else's.
 */
const updateProfile = async (req, res) => {
  try {
    // Step 1: Validate incoming data with Zod
    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const { bio, skills, avatar } = validation.data;

    /*
     * Step 2: Build the update object dynamically.
     * We only update fields that were actually sent.
     * If frontend only sends bio, we don't touch skills or avatar.
     *
     * This is called a "partial update" pattern.
     */
    const fieldsToUpdate = {};
    if (bio !== undefined) fieldsToUpdate.bio = bio;
    if (skills !== undefined) fieldsToUpdate.skills = skills;
    if (avatar !== undefined) fieldsToUpdate.avatar = avatar;

    /*
     * Step 3: Find user by their ID and update.
     *
     * findByIdAndUpdate(id, update, options):
     * - req.user._id  → the logged-in user's ID (from protect middleware)
     * - $set          → only update the fields we specify, leave rest unchanged
     * - { new: true } → return the UPDATED document, not the old one
     * - select("-password") → don't return password in response
     */
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: fieldsToUpdate },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });

  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

module.exports = { getPublicProfile, updateProfile };