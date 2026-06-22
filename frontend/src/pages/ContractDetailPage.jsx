import { useNavigate } from "react-router-dom";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, DollarSign, User,
  CheckCircle, Clock, FileText, AlertCircle
} from "lucide-react";

import { getContractById } from "@/api/contractApi";
import { useAuth } from "@/context/AuthContext";

/*
 * WHAT IS THIS PAGE?
 * Shows full details of one contract.
 * Accessible by both the client and freelancer on that contract.
 *
 * URL: /contracts/:contractId
 *
 * This page will grow in Feature 7 (Stripe payment button),
 * Feature 8 (Submit Work button for freelancer),
 * and Feature 9 (Release Funds button for client).
 */

// ─── Contract Status Steps ────────────────────────────────────
/*
 * Visual progress bar showing where the contract is
 * in its lifecycle. Like a stepper component.
 */
const ContractStatusStepper = ({ status }) => {
  const steps = [
    { key: "pending_payment", label: "Pending Payment", icon: <Clock size={14} /> },
    { key: "funded",          label: "Funded",          icon: <DollarSign size={14} /> },
    { key: "under_review",    label: "Under Review",    icon: <FileText size={14} /> },
    { key: "completed",       label: "Completed",       icon: <CheckCircle size={14} /> },
  ];

  /*
   * Find the index of the current status in the steps array.
   * Steps before this index are "done" (green).
   * The current step is "active" (violet).
   * Steps after are "upcoming" (gray).
   */
  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center flex-1">
          {/* Step Circle */}
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
            index < currentIndex
              ? "bg-green-500 text-white"           // completed step
              : index === currentIndex
              ? "bg-violet-600 text-white"           // current step
              : "bg-slate-800 text-slate-500"        // upcoming step
          }`}>
            {index < currentIndex ? <CheckCircle size={14} /> : step.icon}
          </div>

          {/* Step Label */}
          <div className="hidden ml-2 sm:block">
            <p className={`text-xs font-medium ${
              index <= currentIndex ? "text-white" : "text-slate-500"
            }`}>
              {step.label}
            </p>
          </div>

          {/* Connector Line between steps */}
          {index < steps.length - 1 && (
            <div className={`mx-2 h-0.5 flex-1 ${
              index < currentIndex ? "bg-green-500" : "bg-slate-800"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};


// ─── Main Page ────────────────────────────────────────────────
const ContractDetailPage = () => {
  const { contractId } = useParams();
  const { currentUser } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContractById(contractId),
    enabled: !!contractId,
  });

  const contract = data?.data?.contract;

  // Is the logged-in user the client on this contract?
  const isClient =
    contract?.client?._id?.toString() === currentUser?._id?.toString();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-xl font-semibold text-red-400">Contract not found</p>
          <Link to="/dashboard" className="block mt-4 text-violet-400 hover:underline">
            ← Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 bg-slate-950">
      <div className="max-w-3xl mx-auto">

        {/* Back Button */}
        <Link
          to={isClient ? "/client-dashboard" : "/dashboard"}
          className="inline-flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Contract Details</h1>
          <p className="mt-1 text-slate-400">
            Contract ID: <span className="font-mono text-xs text-slate-500">{contract._id}</span>
          </p>
        </div>

        {/* ── Status Stepper ──────────────────────────────── */}
        <div className="p-6 mb-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-5 text-sm font-semibold tracking-wider uppercase text-slate-500">
            Contract Progress
          </h3>
          <ContractStatusStepper status={contract.status} />
        </div>

        {/* ── Contract Info Card ──────────────────────────── */}
        <div className="p-6 mb-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-5 text-sm font-semibold tracking-wider uppercase text-slate-500">
            Contract Information
          </h3>

          <div className="grid gap-5 sm:grid-cols-2">

            {/* Job Title */}
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">Job</p>
              <Link
                to={`/jobs/${contract.job?._id}`}
                className="mt-1 font-semibold text-white transition hover:text-violet-400"
              >
                {contract.job?.title}
              </Link>
            </div>

            {/* Agreed Amount */}
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">
                Agreed Amount (Escrow)
              </p>
              <p className="flex items-center gap-1 mt-1 text-2xl font-bold text-green-400">
                <DollarSign size={18} />
                {contract.agreedAmount}
              </p>
            </div>

            {/* Contract Status */}
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">Status</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                contract.status === "completed"
                  ? "bg-green-500/10 text-green-400"
                  : contract.status === "funded"
                  ? "bg-blue-500/10 text-blue-400"
                  : contract.status === "under_review"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-slate-700 text-slate-300"
              }`}>
                {contract.status.replace("_", " ")}
              </span>
            </div>

            {/* Created Date */}
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">Created</p>
              <p className="mt-1 text-white">
                {new Date(contract.createdAt).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ── People Card ─────────────────────────────────── */}
        <div className="p-6 mb-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-5 text-sm font-semibold tracking-wider uppercase text-slate-500">
            People Involved
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Client */}
            <div className="p-4 rounded-xl bg-slate-800">
              <p className="mb-2 text-xs tracking-wider uppercase text-slate-500">Client</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center font-semibold text-blue-400 rounded-full h-9 w-9 bg-blue-500/20">
                  {contract.client?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{contract.client?.name}</p>
                  <p className="text-xs text-slate-400">{contract.client?.email}</p>
                </div>
              </div>
            </div>

            {/* Freelancer */}
            <div className="p-4 rounded-xl bg-slate-800">
              <p className="mb-2 text-xs tracking-wider uppercase text-slate-500">Freelancer</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center font-semibold text-green-400 rounded-full h-9 w-9 bg-green-500/20">
                  {contract.freelancer?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{contract.freelancer?.name}</p>
                  <p className="text-xs text-slate-400">{contract.freelancer?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*
         * ACTION SECTION (placeholders for upcoming features)
         *
         * Feature 7 will add: "Pay Now" button (Stripe) for client
         *   when status === "pending_payment"
         *
         * Feature 8 will add: "Submit Work" button for freelancer
         *   when status === "funded"
         *
         * Feature 9 will add: "Release Funds" button for client
         *   when status === "under_review"
         */}
        {contract.status === "pending_payment" && isClient && (
          <div className="p-6 border rounded-2xl border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-400">Payment Required</p>
                <p className="mt-1 text-sm text-slate-400">
                  Pay ${contract.agreedAmount} to fund the escrow and let the freelancer begin work.
                </p>
                {contract.status === "pending_payment" && isClient && (
  <div className="p-6 border rounded-2xl border-yellow-500/20 bg-yellow-500/5">
    <div className="flex items-start gap-3">
      <AlertCircle size={20} className="shrink-0 text-yellow-400 mt-0.5" />
      <div>
        <p className="font-semibold text-yellow-400">Payment Required</p>
        <p className="mt-1 text-sm text-slate-400">
          Pay ${contract.agreedAmount} to fund the escrow and
          let the freelancer begin work.
        </p>
        {/*
         * Navigate to PaymentPage with the contractId.
         * PaymentPage will fetch the clientSecret and
         * show the Stripe card form.
         */}
        <button
          onClick={() => navigate(`/payment/${contract._id}`)}
          className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          <Lock size={14} />
          Pay ${contract.agreedAmount} Now
        </button>
      </div>
    </div>
  </div>
)}

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ContractDetailPage;