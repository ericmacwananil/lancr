const { z } = require("zod");

/*
 * WHY ZOD?
 * Zod lets us define the exact shape of data we expect from the frontend.
 * If the data doesn't match, Zod gives us clear error messages BEFORE
 * the data ever touches the database. This is our first line of defense.
 *
 * Think of it as a "security guard" at the door of each route.
 */

// ─── Register Schema ──────────────────────────────────────────
/*
 * z.object() defines an object with specific fields.
 * Each field has its own rules (type, min length, etc.)
 */
const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email"),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),

  role: z.enum(["client", "freelancer"], {
    errorMap: () => ({ message: "Role must be client or freelancer" }),
  }),
});

// ─── Login Schema ─────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email"),

  password: z.string({ required_error: "Password is required" }),
});

module.exports = { registerSchema, loginSchema };