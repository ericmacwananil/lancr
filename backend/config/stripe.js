const Stripe = require("stripe");

/*
 * WHAT IS THIS FILE?
 * Creates and exports one Stripe instance used across the app.
 *
 * WHY ONE INSTANCE?
 * Instead of writing new Stripe(key) in every controller,
 * we create it once here and import it wherever needed.
 * Same pattern as our db.js for MongoDB.
 *
 * process.env.STRIPE_SECRET_KEY comes from your .env file.
 * NEVER hardcode the key directly in code.
 * The secret key starts with "sk_test_..." in test mode.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;