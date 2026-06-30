import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Lock, DollarSign, ArrowLeft } from "lucide-react";

import { getContractById } from "@/api/contractApi";
import { createPaymentIntent, manuallyFundContract } from "@/api/paymentApi";

/*
 * WHAT IS THIS FILE?
 * The payment page where the client enters card details
 * and pays the escrow amount.
 *
 * HOW STRIPE ELEMENTS WORKS:
 * loadStripe() → connects to Stripe using publishable key
 * <Elements>   → Stripe's context provider (like QueryClientProvider)
 * <CardElement>→ Stripe's secure card input (hosted in an iframe)
 * useStripe()  → gives us the stripe object to confirm payment
 * useElements()→ gives us access to the CardElement's value
 *
 * The card details NEVER touch our server.
 * They go directly from the CardElement to Stripe's servers.
 */

/*
 * loadStripe() initializes Stripe with our publishable key.
 * Called OUTSIDE the component so it only runs once,
 * not every time the component re-renders.
 *
 * import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY reads from .env file.
 * In Vite, all env vars must start with VITE_ to be accessible.
 */
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Stripe CardElement custom styles to match our dark theme
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#ffffff",
      fontFamily: "inherit",
      "::placeholder": {
        color: "#64748b", // slate-500
      },
      backgroundColor: "transparent",
    },
    invalid: {
      color: "#f87171", // red-400
    },
  },
};


// ─── Inner Payment Form ───────────────────────────────────────
/*
 * WHY A SEPARATE INNER COMPONENT?
 * useStripe() and useElements() hooks can ONLY be used inside
 * a component that is wrapped by <Elements> provider.
 * So we split into:
 * - PaymentPage (outer) → sets up <Elements> provider
 * - PaymentForm (inner) → uses the Stripe hooks
 */
const PaymentForm = ({ contract, clientSecret, queryClient }) => {
  /*
   * useStripe() gives us the stripe object.
   * We use stripe.confirmCardPayment() to process the payment.
   *
   * useElements() gives us access to the CardElement component.
   * We pass it to stripe.confirmCardPayment() to get the card data.
   */
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    /*
     * stripe and elements are null until Stripe.js loads.
     * This check prevents errors if user clicks before it loads.
     */
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setCardError("");

    /*
     * stripe.confirmCardPayment() is the KEY step.
     * It does two things:
     * 1. Gets the card details from the CardElement (securely)
     * 2. Sends them to Stripe to confirm the payment
     *
     * clientSecret: the temporary key we got from our backend.
     * It tells Stripe which PaymentIntent to confirm.
     *
     * elements.getElement(CardElement): gets the card input's value.
     */
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      }
    );

    if (error) {
      /*
       * error.message comes from Stripe.
       * Examples: "Your card was declined", "Insufficient funds"
       */
      setCardError(error.message);
      setIsProcessing(false);
      return;
    }

    if (paymentIntent.status === "succeeded") {
      /*
       * Payment succeeded on Stripe's side!
       *
       * For local development, we manually update the contract status
       * since Stripe can't send webhooks to localhost.
       */
      try {
        await manuallyFundContract(contract._id);
        // Invalidate the contract query so the next page fetches fresh data
        queryClient.invalidateQueries(["contract", contract._id]);
        queryClient.invalidateQueries(["myContracts"]);
        queryClient.invalidateQueries(["authUser"]);
      } catch (err) {
        console.error("Failed to manually fund contract:", err);
      }
      
      toast.success("Payment successful! Contract is now funded 🎉");
      navigate(`/contracts/${contract._id}`);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Amount Summary */}
      <div className="p-5 rounded-xl bg-slate-800">
        <p className="text-sm text-slate-400">Escrow Amount to Pay</p>
        <div className="flex items-center gap-1 mt-1">
          <DollarSign size={20} className="text-green-400" />
          <span className="text-3xl font-bold text-green-400">
            {contract.agreedAmount}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Funds are held in escrow until you release them after reviewing the work.
        </p>
      </div>

      {/* Card Input */}
      <div>
        <label className="block mb-2 text-sm font-medium text-slate-300">
          Card Details
        </label>
        {/*
         * CardElement renders Stripe's secure card input.
         * It's actually inside an iframe — your JS can't read the values.
         * This is what makes it PCI compliant.
         */}
        <div className="p-4 transition border rounded-lg border-slate-700 bg-slate-800 focus-within:border-violet-500">
          <CardElement options={cardElementOptions} />
        </div>

        {/* Show card errors (wrong number, expired, etc.) */}
        {cardError && (
          <p className="mt-2 text-sm text-red-400">{cardError}</p>
        )}
      </div>

      {/* Test Card Hint */}
      <div className="p-4 border rounded-lg border-blue-500/20 bg-blue-500/5">
        <p className="text-xs font-medium text-blue-400">
          🧪 Test Mode — Use this test card:
        </p>
        <p className="mt-1 font-mono text-sm text-blue-300">
          4242 4242 4242 4242
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Expiry: any future date | CVC: any 3 digits | ZIP: any 5 digits
        </p>
      </div>

      {/* Pay Button */}
      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="flex items-center justify-center w-full gap-2 py-3 font-semibold text-white transition rounded-lg bg-violet-600 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Lock size={16} />
        {isProcessing
          ? "Processing Payment..."
          : `Pay $${contract.agreedAmount} Securely`}
      </button>

      <p className="text-xs text-center text-slate-500">
        🔒 Payments are secured by Stripe. Your card details never touch our servers.
      </p>
    </form>
  );
};


// ─── Outer Payment Page ───────────────────────────────────────
const PaymentPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // clientSecret state — fetched from our backend
  const [clientSecret, setClientSecret] = useState(null);
  const [intentError, setIntentError] = useState("");

  // Fetch contract details
  const { data, isLoading } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContractById(contractId),
    enabled: !!contractId,
  });

  const contract = data?.data?.contract;

  /*
   * Fetch the clientSecret from our backend when the page loads.
   * useEffect runs after the component renders.
   * Dependency array [contractId]: runs when contractId changes.
   */
  useEffect(() => {
    if (!contractId) return;

    const fetchIntent = async () => {
      try {
        const result = await createPaymentIntent(contractId);
        setClientSecret(result.data.clientSecret);
      } catch (error) {
        setIntentError(error.message || "Failed to initialize payment");
      }
    };

    fetchIntent();
  }, [contractId]);

  if (isLoading || !clientSecret) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
          <p className="mt-4 text-slate-400">Setting up payment...</p>
        </div>
      </div>
    );
  }

  if (intentError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-red-400">{intentError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 bg-slate-950">
      <div className="max-w-lg mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Fund Escrow</h1>
          <p className="mt-2 text-slate-400">
            Payment is held safely until you approve the work
          </p>
        </div>

        {/* Job & Freelancer Summary */}
        {contract && (
          <div className="p-5 mb-6 border rounded-2xl border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-wider uppercase text-slate-500">Job</p>
                <p className="mt-1 font-semibold text-white">{contract.job?.title}</p>
              </div>
              <div className="text-right">
                <p className="text-xs tracking-wider uppercase text-slate-500">Freelancer</p>
                <p className="mt-1 font-semibold text-white">{contract.freelancer?.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stripe Payment Form */}
        <div className="p-6 border rounded-2xl border-slate-800 bg-slate-900">
          {/*
           * <Elements> is Stripe's context provider.
           * It MUST wrap any component that uses Stripe hooks.
           * stripe={stripePromise} → passes our Stripe instance
           * options={{ clientSecret }} → tells Stripe which payment to process
           */}
          <Elements
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <PaymentForm 
              contract={contract} 
              clientSecret={clientSecret} 
              queryClient={queryClient}
            />
          </Elements>
        </div>

      </div>
    </div>
  );
};

export default PaymentPage;