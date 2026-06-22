const { z } = require("zod");

/*
 * WHAT IS THIS FILE?
 * Before we update a user's profile, we check if the data
 * sent from frontend is valid using Zod.
 * Example: skills must be an array, bio can't be too long.
 */

const updateProfileSchema = z.object({
  bio: z
    .string()
    .max(500, "Bio cannot exceed 500 characters")
    .optional(), // optional means this field is not required

  skills: z
    .array(z.string())
    .max(15, "Cannot add more than 15 skills")
    .optional(),

  avatar: z
    .string()
    .url("Avatar must be a valid URL")
    .optional(),
});

module.exports = { updateProfileSchema };