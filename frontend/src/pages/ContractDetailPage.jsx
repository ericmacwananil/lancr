import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, DollarSign, User,
  CheckCircle, Clock, FileText,
  AlertCircle, Lock, ExternalLink,
  RefreshCw, ShieldCheck, Star,
} from "lucide-react";

import { getContractById, releaseFunds, requestRevision } from "@/api/contractApi";
import { checkIfReviewed } from "@/api/reviewApi";
import { useAuth } from "@/context/AuthContext";
import ReviewForm from "@/components/ReviewForm";

// ─── Status Stepper ───────────────────────────────────────────
const ContractStatusStepper = ({ status }) => {
  const steps = [
    { key: "pending_payment", label: "Pending Payment", icon: <Clock size={14} /> },
    { key: "funded",          label: "Funded",          icon: <DollarSign size={14} /> },
    { key: "under_review",    label: "Under Review",    icon: <FileText size={14} /> },
    { key: "completed",       label: "Completed",       icon: <CheckCircle size={14} /> },
  ];

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center flex-1">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
            index < currentIndex
              ? "bg-green-500 text-white"
              : index === currentIndex
              ? "bg-violet-600 text-white"
              : "bg-slate-800 text-slate-500"
          }`}>
            {index < currentIndex ? <CheckCircle size={14} /> : step.icon}
          </div>
          <div className="hidden ml-2 sm:block">
            <p className={`text-xs font-medium ${
              index <= currentIndex ? "text-white" : "text-slate-500"
            }`}>
              {step.label}
            </p>
          </div>
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


// ─── Release Funds Confirmation Modal ─────────────────────────
const ReleaseFundsModal = ({ isOpen, onClose, onConfirm, contract, isPending }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6 border rounded-2xl border-slate-700 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-green-500/10">
          <ShieldCheck size={24} className="text-green-400" />
        </div>

        <h3 className="text-lg font-bold text-white">Release Funds?</h3>

        <div className="p-4 mt-3 rounded-xl bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Amount</p>
              <p className="text-2xl font-bold text-green-400">
                ${contract?.agreedAmount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Paid to</p>
              <p className="font-semibold text-white">
                {contract?.freelancer?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-3 mt-4 rounded-xl bg-red-500/5">
          <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
          <p className="text-xs text-red-400">
            This will permanently release ${contract?.agreedAmount} to{" "}
            {contract?.freelancer?.name}. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-slate-700 py-2.5 text-slate-300 transition hover:border-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-lg bg-green-600 py-2.5 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Releasing..." : "Yes, Release"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ─── Main Contract Detail Page ────────────────────────────────
const ContractDetailPage = () => {
  const { contractId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showReleaseModal, setShowReleaseModal] = useState(false);

  // ─── Fetch Contract ────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContractById(contractId),
    enabled: !!contractId,
  });

  const contract = data?.data?.contract;

  const isClient =
    contract?.client?._id?.toString() === currentUser?._id?.toString();
  const isFreelancer =
    contract?.freelancer?._id?.toString() === currentUser?._id?.toString();

  // ─── Check If Already Reviewed ────────────────────────────
  /*
   * Only runs when:
   * - contractId exists
   * - contract is completed
   * - logged in user is the client
   *
   * Returns { hasReviewed: true/false }
   * Used to show ReviewForm or "Already Reviewed" message.
   */
  const { data: reviewCheckData, refetch: refetchReviewCheck } = useQuery({
    queryKey: ["reviewCheck", contractId],
    queryFn: () => checkIfReviewed(contractId),
    enabled: !!contractId && contract?.status === "completed" && isClient,
  });

  const hasReviewed = reviewCheckData?.data?.hasReviewed || false;

  // ─── Release Funds Mutation ────────────────────────────────
  const { mutate: handleRelease, isPending: isReleasing } = useMutation({
    mutationFn: () => releaseFunds(contractId),
    onSuccess: () => {
      toast.success("Funds released! Contract completed. 🎉");
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["myContracts"] });
      queryClient.invalidateQueries({ queryKey: ["myJobs"] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      setShowReleaseModal(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to release funds");
      setShowReleaseModal(false);
    },
  });

  // ─── Request Revision Mutation ─────────────────────────────
  const { mutate: handleRevision, isPending: isRevising } = useMutation({
    mutationFn: () => requestRevision(contractId),
    onSuccess: () => {
      toast.success("Revision requested. Freelancer can now resubmit.");
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["myContracts"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to request revision");
    },
  });

  // ─── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────
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

        {/* Back */}
        <Link
          to={isClient ? "/client-dashboard" : "/freelancer-dashboard"}
          className="inline-flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Contract Details</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">{contract._id}</p>
        </div>

        {/* Status Stepper */}
        <div className="p-6 mb-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-5 text-sm font-semibold tracking-wider uppercase text-slate-500">
            Contract Progress
          </h3>
          <ContractStatusStepper status={contract.status} />
        </div>

        {/* Contract Info */}
        <div className="p-6 mb-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-5 text-sm font-semibold tracking-wider uppercase text-slate-500">
            Contract Information
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">Job</p>
              <Link
                to={`/jobs/${contract.job?._id}`}
                className="mt-1 font-semibold text-white transition hover:text-violet-400"
              >
                {contract.job?.title}
              </Link>
            </div>
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">
                Agreed Amount
              </p>
              <p className="flex items-center gap-1 mt-1 text-2xl font-bold text-green-400">
                <DollarSign size={18} />
                {contract.agreedAmount}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">Status</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                contract.status === "completed"      ? "bg-green-500/10 text-green-400"
                : contract.status === "funded"       ? "bg-blue-500/10 text-blue-400"
                : contract.status === "under_review" ? "bg-yellow-500/10 text-yellow-400"
                : "bg-slate-700 text-slate-300"
              }`}>
                {contract.status.replace("_", " ")}
              </span>
            </div>
            <div>
              <p className="text-xs tracking-wider uppercase text-slate-500">Created</p>
              <p className="mt-1 text-white">
                {new Date(contract.createdAt).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Delivery File */}
          {contract.deliveryFile && (
            <div className="pt-5 mt-5 border-t border-slate-800">
              <p className="mb-2 text-xs tracking-wider uppercase text-slate-500">
                Submitted Work
              </p>
              <a
                href={contract.deliveryFile}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-2.5 text-sm text-violet-400 transition hover:border-violet-500 hover:bg-violet-500/10"
              >
                <FileText size={14} />
                View Submitted File
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* People */}
        <div className="p-6 mb-6 border rounded-2xl border-slate-800 bg-slate-900">
          <h3 className="mb-5 text-sm font-semibold tracking-wider uppercase text-slate-500">
            People Involved
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
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

        {/* ── ACTION SECTIONS ──────────────────────────────── */}

        {/* Pending Payment */}
        {contract.status === "pending_payment" && isClient && (
          <div className="p-6 border rounded-2xl border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-400">Payment Required</p>
                <p className="mt-1 text-sm text-slate-400">
                  Pay ${contract.agreedAmount} to fund the escrow.
                </p>
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

        {/* Funded */}
        {contract.status === "funded" && (
          <div className="p-6 border rounded-2xl border-blue-500/20 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <Clock size={20} className="shrink-0 text-blue-400 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-400">Waiting for Work Submission</p>
                <p className="mt-1 text-sm text-slate-400">
                  {isFreelancer
                    ? "Go to your dashboard to submit your completed work."
                    : "The freelancer is working on the project."}
                </p>
                {isFreelancer && (
                  <Link
                    to="/freelancer-dashboard"
                    className="mt-4 inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                  >
                    Submit Work
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Under Review — Client Actions */}
        {contract.status === "under_review" && isClient && (
          <div className="p-6 border rounded-2xl border-yellow-500/20 bg-yellow-500/5">
            <h3 className="mb-2 font-semibold text-yellow-400">
              Work Submitted — Your Review Required
            </h3>
            <p className="mb-5 text-sm text-slate-400">
              The freelancer has submitted their work. Review it and decide:
            </p>

            {contract.deliveryFile && (
              <a
                href={contract.deliveryFile}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-5 flex w-fit items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:border-violet-500 hover:text-violet-400"
              >
                <FileText size={14} />
                View Submitted Work
                <ExternalLink size={12} />
              </a>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowReleaseModal(true)}
                disabled={isReleasing || isRevising}
                className="flex items-center justify-center flex-1 gap-2 py-3 font-semibold text-white transition bg-green-600 rounded-lg hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle size={16} />
                Release Funds ✅
              </button>

              <button
                onClick={() => handleRevision()}
                disabled={isRevising || isReleasing}
                className="flex items-center justify-center flex-1 gap-2 py-3 font-semibold transition border rounded-lg border-slate-700 text-slate-300 hover:border-violet-500 hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} />
                Request Revision 🔄
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Releasing funds is permanent and cannot be reversed.
            </p>
          </div>
        )}

        {/* Under Review — Freelancer View */}
        {contract.status === "under_review" && isFreelancer && (
          <div className="p-6 border rounded-2xl border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Clock size={20} className="shrink-0 text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-400">Work Under Review</p>
                <p className="mt-1 text-sm text-slate-400">
                  The client is reviewing your submitted work.
                  You'll be notified when they release funds or request changes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/*
         * COMPLETED SECTION
         * Shows:
         * 1. Green "Contract Completed" banner
         * 2. Review form for client (if not yet reviewed)
         * 3. "Already Reviewed" message (if already submitted)
         */}
        {contract.status === "completed" && (
          <div className="space-y-4">

            {/* Completed Banner */}
            <div className="p-6 border rounded-2xl border-green-500/20 bg-green-500/5">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="shrink-0 text-green-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-400">
                    Contract Completed! 🎉
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    ${contract.agreedAmount} has been released to{" "}
                    {contract.freelancer?.name}.
                  </p>
                </div>
              </div>
            </div>

            {/*
             * REVIEW SECTION — Only for the CLIENT.
             *
             * hasReviewed = true  → show "Already Reviewed" badge
             * hasReviewed = false → show ReviewForm
             *
             * refetchReviewCheck() is called after ReviewForm
             * submits successfully → switches from form to badge.
             */}
            {isClient && (
              <div className="p-6 border rounded-2xl border-slate-800 bg-slate-900">
                {hasReviewed ? (
                  // Already Reviewed
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10">
                      <Star size={18} className="text-green-400 fill-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Review Submitted ✅</p>
                      <p className="text-sm text-slate-400">
                        Thank you for your feedback!
                      </p>
                    </div>
                  </div>
                ) : (
                  // Review Form
                  <div>
                    <h3 className="mb-5 text-lg font-semibold text-white">
                      Leave a Review
                    </h3>
                    <ReviewForm
                      contract={contract}
                      onSuccess={() => refetchReviewCheck()}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Release Funds Modal */}
      <ReleaseFundsModal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        onConfirm={handleRelease}
        contract={contract}
        isPending={isReleasing}
      />
    </div>
  );
};

export default ContractDetailPage;