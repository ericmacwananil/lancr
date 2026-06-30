const stripe = require("../config/stripe");
const Contract = require("../models/Contract");

/*
 * WHAT IS THIS FILE?
 * Two controllers for handling Stripe payments:
 *
 * 1. createPaymentIntent → frontend calls this to start a payment
 * 2. stripeWebhook       → Stripe calls this when payment succeeds
 *
 * ─── HOW STRIPE PAYMENTS WORK (READ THIS) ───────────────────
 *
 * STEP 1: Frontend asks backend "I want to pay $450"
 * STEP 2: Backend tells Stripe "Create a payment of $450"
 * STEP 3: Stripe gives backend a "clientSecret" (a temporary key)
 * STEP 4: Backend sends clientSecret to frontend
 * STEP 5: Frontend uses clientSecret + card details to pay Stripe directly
 * STEP 6: Stripe processes the payment
 * STEP 7: Stripe sends a "webhook" (HTTP POST) to our backend saying "payment done!"
 * STEP 8: Our backend updates Contract status to "funded"
 *
 * WHY THIS FLOW?
 * Card details NEVER touch our server. They go directly to Stripe.
 * This keeps us PCI compliant and secure.
 */


// ─── CREATE PAYMENT INTENT ────────────────────────────────────
/*
 * @route   POST /api/payments/create-intent/:contractId
 * @access  Private — Client only
 *
 * Creates a Stripe PaymentIntent and returns the clientSecret.
 * The frontend uses clientSecret to render the payment form.
 */
const createPaymentIntent = async (req, res) => {
  try {
    // Step 1: Find the contract
    const contract = await Contract.findById(req.params.contractId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Step 2: Only the client on this contract can pay
    if (contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the client can make this payment",
      });
    }

    // Step 3: Only pay if contract is still waiting for payment
    if (contract.status !== "pending_payment") {
      return res.status(400).json({
        success: false,
        message: `Contract is already ${contract.status}`,
      });
    }

    /*
     * Step 4: Create a PaymentIntent with Stripe.
     *
     * WHAT IS A PAYMENTINTENT?
     * It's Stripe's way of tracking one payment attempt.
     * Think of it as a "payment order" that Stripe manages.
     *
     * amount: Stripe uses CENTS not dollars.
     * $450 → 450 * 100 = 45000 cents
     * Math.round() avoids floating point issues like 450.1 * 100 = 45010.000000001
     *
     * currency: "usd" = US dollars
     *
     * metadata: extra info we attach to the payment.
     * We store contractId so when the webhook fires,
     * we know WHICH contract to update.
     */
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(contract.agreedAmount * 100), // dollars → cents
      currency: "usd",
      metadata: {
        contractId: contract._id.toString(),
        clientId: req.user._id.toString(),
      },
    });

    /*
     * Step 5: Save the PaymentIntent ID to the contract.
     * We'll need this later to verify the webhook.
     *
     * paymentIntent.id looks like: "pi_3OqX..."
     */
    contract.stripePaymentIntentId = paymentIntent.id;
    await contract.save();

    /*
     * Step 6: Return the clientSecret to the frontend.
     *
     * WHAT IS clientSecret?
     * It's a temporary, single-use key that allows the frontend
     * to confirm the payment with Stripe directly.
     * It does NOT give access to your Stripe account.
     * It expires after a few hours.
     *
     * paymentIntent.client_secret looks like: "pi_3OqX..._secret_abc123..."
     */
    return res.status(200).json({
      success: true,
      message: "Payment intent created",
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: contract.agreedAmount,
      },
    });

  } catch (error) {
    console.error("createPaymentIntent error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment intent",
    });
  }
};


// ─── STRIPE WEBHOOK ───────────────────────────────────────────
/*
 * @route   POST /api/payments/webhook
 * @access  Public — called by Stripe servers (not users)
 *
 * WHAT IS A WEBHOOK?
 * After the user pays on the frontend, Stripe sends an HTTP POST
 * request to THIS endpoint to say "payment was successful".
 * Our server listens for this and updates the contract.
 *
 * WHY NOT JUST TRUST THE FRONTEND?
 * A hacker could call your "payment success" endpoint without paying.
 * Webhooks come from Stripe's servers and are cryptographically signed.
 * We verify the signature to prove it's really from Stripe.
 *
 * IMPORTANT: This route needs RAW body (not JSON parsed).
 * Stripe signs the raw bytes of the request.
 * If Express parses it to JSON first, the signature breaks.
 * That's why in paymentRoutes.js we use express.raw() middleware.
 */
const stripeWebhook = async (req, res) => {
  /*
   * stripe-signature is a header Stripe sends with every webhook.
   * It's a cryptographic hash proving the request came from Stripe.
   */
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    /*
     * stripe.webhooks.constructEvent() does TWO things:
     * 1. Verifies the signature using STRIPE_WEBHOOK_SECRET
     * 2. Parses the raw body into a Stripe event object
     *
     * If signature is invalid → throws an error → we reject it.
     * This prevents fake webhook calls from hackers.
     *
     * req.body here is the RAW buffer (not parsed JSON)
     * because we use express.raw() on this route.
     */
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    /*
     * If signature verification fails, reject immediately.
     * Don't process this webhook — it might be fake.
     */
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }

  /*
   * Handle different Stripe event types.
   * We only care about "payment_intent.succeeded" for now.
   * In a real app, you'd also handle:
   * - payment_intent.payment_failed (notify client of failure)
   * - customer.subscription.deleted (cancel subscription)
   * etc.
   */
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    /*
     * Get the contractId we stored in metadata when creating
     * the PaymentIntent in createPaymentIntent().
     */
    const contractId = paymentIntent.metadata.contractId;

    try {
      /*
       * Update the contract status to "funded".
       * Now the freelancer can start working!
       *
       * We use findByIdAndUpdate here (not a full ACID transaction)
       * because this is a single operation — no need for a session.
       */
      await Contract.findByIdAndUpdate(contractId, {
        $set: { status: "funded" },
      });

      console.log(`✅ Contract ${contractId} funded via Stripe`);

    } catch (error) {
      console.error("Failed to update contract after payment:", error);
      /*
       * Even if our DB update fails, we send 200 to Stripe.
       * Why? If we send an error, Stripe will RETRY the webhook
       * multiple times, which could cause duplicate updates.
       * Instead we log the error and handle it manually.
       */
    }
  }

  /*
   * Always send 200 OK to Stripe after receiving the webhook.
   * This tells Stripe "we received it, stop retrying".
   * If we send an error code, Stripe retries the webhook for days.
   */
  res.status(200).json({ received: true });
};


// For DEVELOPMENT ONLY: Manually fund a contract (skip Stripe webhook)
const manuallyFundContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.contractId);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    if (contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the client can fund this contract",
      });
    }

    contract.status = "funded";
    await contract.save();

    return res.status(200).json({
      success: true,
      message: "Contract funded successfully",
      data: { contract },
    });

  } catch (error) {
    console.error("manuallyFundContract error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fund contract",
    });
  }
};

module.exports = { createPaymentIntent, stripeWebhook, manuallyFundContract };