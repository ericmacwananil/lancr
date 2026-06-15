const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/*
 * WHY A MODEL?
 * A Mongoose Model is a blueprint for how data is stored in MongoDB.
 * Every user document in the DB will follow this exact shape.
 * Think of it like a "form template" — everyone fills the same fields.
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true, // removes extra spaces from start/end
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // no two users can have the same email
      lowercase: true, // always store email in lowercase
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      /*
       * select: false means this field will NOT be returned
       * in any query by default. This protects the password
       * from accidentally being sent to the frontend.
       * To get it, you must explicitly write .select("+password")
       */
      select: false,
    },

    role: {
      type: String,
      /*
       * enum restricts the value to only these options.
       * A user MUST be either a client or freelancer — nothing else.
       */
      enum: {
        values: ["client", "freelancer", "admin"],
        message: "Role must be client, freelancer, or admin",
      },
      default: "client",
    },

    avatar: {
      type: String,
      default: "", // Will store a Cloudinary URL in Feature 8
    },

    bio: {
      type: String,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },

    /*
     * Skills is an array of strings e.g. ["React", "Node.js", "MongoDB"]
     * Used on Freelancer profiles to show what they can do.
     */
    skills: {
      type: [String],
      default: [],
    },

    /*
     * earnings stores how much money the freelancer has made.
     * This gets updated in Feature 9 (Release Funds) using
     * a MongoDB ACID Transaction.
     */
    earnings: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    /*
     * timestamps: true automatically adds two fields:
     * - createdAt: when the document was created
     * - updatedAt: when the document was last modified
     * You don't need to manage these manually.
     */
    timestamps: true,
  }
);

/*
 * PRE-SAVE HOOK — runs automatically BEFORE saving to DB.
 *
 * WHY DO WE HASH PASSWORDS?
 * Never store plain text passwords. If your DB is ever hacked,
 * the attacker would only get hashed values, not real passwords.
 *
 * bcrypt.hash(password, saltRounds):
 * - saltRounds: 12 means it runs the hash algorithm 2^12 = 4096 times.
 * - Higher = more secure but slower. 12 is the industry standard.
 */
userSchema.pre("save", async function (next) {
  // Only hash if password was changed (not on profile update)
  if (!this.isModified("password")) return next();

//   run this when New User Registration
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/*
 * INSTANCE METHOD — a function available on every user document.
 *
 * Usage: const isMatch = await user.comparePassword("enteredPassword");
 *
 * bcrypt.compare() hashes the entered password and compares it
 * to the stored hash. Returns true or false.
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;