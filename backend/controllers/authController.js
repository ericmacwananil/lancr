const User = require("../models/User");
const generateTokenAndSetCookie = require("../utils/generateToken");
const { registerSchema, loginSchema } = require("../validators/authValidators");

/*
 * WHY SEPARATE CONTROLLERS FROM ROUTES?
 * Routes just define the URL and HTTP method.
 * Controllers contain the actual business logic.
 *
 * This separation makes code:
 * - Easier to read (routes file stays small)
 * - Easier to test (you can test controller logic independently)
 * - Easier to maintain (one place to update logic)
 */

// ─── REGISTER ─────────────────────────────────────────────────
/*
 * @route   POST /api/auth/register
 * @access  Public (anyone can register)
 */
const register = async (req, res) => {
  try {
    // Step 1: Validate incoming data with Zod
    /*
     * safeParse() won't throw an error if validation fails.
     * Instead it returns: { success: true, data: ... }
     *                  or { success: false, error: ... }
     * This lets us handle errors gracefully.
     */
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      // Format Zod errors into a readable array
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errors[0], // send first error message
        errors,
      });
    }

    const { name, email, password, role } = validation.data;

    // Step 2: Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Step 3: Create the user
    /*
     * We don't hash the password here — the pre-save hook
     * in User.js handles that automatically before saving.
     */
    const user = await User.create({ name, email, password, role });

    // Step 4: Generate JWT and set it as HttpOnly cookie
    generateTokenAndSetCookie(res, user._id);

    // Step 5: Send back user info (WITHOUT password)
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          skills: user.skills,
          earnings: user.earnings,
        },
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────
/*
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    // Step 1: Validate input
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const { email, password } = validation.data;

    // Step 2: Find user by email
    /*
     * We add .select("+password") here because in the model
     * we set select: false on the password field.
     * We need the password ONLY in this controller to verify it.
     */
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      /*
       * SECURITY TIP: Don't say "email not found" or "wrong password"
       * separately. A vague message prevents attackers from knowing
       * which part is wrong (user enumeration attack prevention).
       */
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Step 3: Compare entered password with hashed password in DB
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Step 4: Generate JWT cookie
    generateTokenAndSetCookie(res, user._id);

    // Step 5: Send response
    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          skills: user.skills,
          earnings: user.earnings,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────
/*
 * @route   POST /api/auth/logout
 * @access  Private
 *
 * To "logout" with cookie-based auth, we simply overwrite
 * the cookie with an empty value and set it to expire immediately.
 * The browser then deletes it automatically.
 */
const logout = async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    expires: new Date(0), // set expiry to the past → browser deletes it
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// ─── GET ME ───────────────────────────────────────────────────
/*
 * @route   GET /api/auth/me
 * @access  Private (requires protect middleware)
 *
 * Since protect middleware already fetched the user and
 * attached it to req.user, we just return it here.
 * This is used on app load to check if the user is still logged in.
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: {
      user: req.user,
    },
  });
};

module.exports = { register, login, logout, getMe };