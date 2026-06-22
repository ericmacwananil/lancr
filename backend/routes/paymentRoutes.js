const express = require("express");
const router = express.Router();

const { createPaymentIntent, stripeWebhook } = require("../controllers/paymentController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

/*
 * WEBHOOK ROUTE — Must come FIRST and use express.raw()
 *
 * WHY express.raw()?
 * Stripe verifies webhook authenticity by checking the raw
 * request body bytes. If we use express.json() (which parses
 * the body into a JS object), the raw bytes change and
 * signature verification fails → webhook always rejected.
 *
 * express.raw({ type: "application/json" }) keeps the body
 * as a Buffer (raw bytes) so Stripe can verify it correctly.
 *
 * In server.js we have app.use(express.json()) globally,
 * but this route-level middleware OVERRIDES it for this route only.
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // ← raw body, not parsed JSON
  stripeWebhook
);

/*
 * CREATE PAYMENT INTENT — Client calls this to start a payment.
 * Protected + client only.
 */
router.post(
  "/create-intent/:contractId",
  protect,
  restrictTo("client"),
  createPaymentIntent
);

module.exports = router;