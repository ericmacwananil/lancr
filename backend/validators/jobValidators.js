const { z } = require("zod");

/*
 * WHAT IS THIS FILE?
 * Zod schemas for validating job data.
 * Before saving a job to DB, we check:
 * - Title exists and isn't too long
 * - Budget is a positive number
 * - Skills is an array of strings
 */

// ─── Create Job Schema ────────────────────────────────────────
const createJobSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title cannot exceed 100 characters"),

  description: z
    .string({ required_error: "Description is required" })
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description cannot exceed 2000 characters"),

  budget: z
    .number({ required_error: "Budget is required" })
    .min(1, "Budget must be at least $1"),

  skillsRequired: z
    .array(z.string())
    .max(10, "Cannot require more than 10 skills")
    .optional()
    .default([]),
});

// ─── Update Job Schema ────────────────────────────────────────
/*
 * .partial() makes ALL fields optional.
 * This is perfect for updates — client may only want
 * to change the title, not the whole job.
 */
const updateJobSchema = createJobSchema.partial();

module.exports = { createJobSchema, updateJobSchema };