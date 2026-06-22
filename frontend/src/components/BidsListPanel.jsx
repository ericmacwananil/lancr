import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { getBidsForJob, updateBidStatus } from "@/api/bidApi";
import { acceptBid } from "@/api/contractApi"; // ← NEW IMPORT

/*
 * WHAT CHANGED IN THIS FILE?
 * Before Feature 6: Accept button called PUT /api/bids/:id/status
 * After Feature 6:  Accept button now calls POST /api/contracts/accept-bid/:bidId
 *
 * The new flow:
 * 1. Client clicks "Accept Bid"
 * 2. Confirmation modal appears ("Are you sure?")
 * 3. Client confirms
 * 4. Frontend calls acceptBid(bidId) → triggers ACID transaction
 * 5. On success → navigate to ContractDetailPage
 */

const BidStatusBadge = ({ status }) => {
  const config = {
    pending:  { color: "bg-yellow-500/10 text-yellow-400", icon: <Clock size={11} /> },
    accepted: { color: "bg-green-500/10 text-green-400",  icon: <CheckCircle size={11} /> },
    rejected: { color: "bg-red-500/10 text-red-400",      icon: <XCircle size={11} /> },
  };
  const { color, icon } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {icon}{status}
    </span>
  );
};


// ─── Confirmation Modal ───────────────────────────────────────
/*
 * NEW COMPONENT: A popup asking "Are you sure?" before accepting.
 * This prevents accidental clicks on such an important action.
 *
 * Props:
 * - isOpen    → show/hide the modal
 * - onClose   → cancel button handler
 * - onConfirm → confirm button handler (triggers ACID transaction)
 * - bid       → the bid object (to show amount and freelancer name)
 * - isPending → true while API call is in progress
 */
const ConfirmAcceptModal = ({ isOpen, onClose, onConfirm, bid, isPending }) => {
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
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-green-500/10">
          <AlertTriangle size={24} className="text-green-400" />
        </div>

        <h3 className="text-lg font-bold text-white">Accept this bid?</h3>

        {/*
         * Show the bid details so client can confirm
         * they're accepting the right bid.
         */}
        <div className="p-4 mt-3 rounded-xl bg-slate-800">
          <p className="text-sm text-slate-400">Freelancer</p>
          <p className="font-semibold text-white">{bid?.freelancer?.name}</p>
          <p className="mt-2 text-sm text-slate-400">Agreed Amount</p>
          <p className="text-xl font-bold text-green-400">${bid?.amount}</p>
        </div>

        <p className="mt-4 text-sm text-slate-400">
          This will create a contract and notify the freelancer.
          All other bids will be rejected automatically.
        </p>

        {/* Action Buttons */}
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
            {isPending ? "Creating Contract..." : "Yes, Accept"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ─── Main BidsListPanel ───────────────────────────────────────
const BidsListPanel = ({ jobId, jobStatus }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /*
   * Track which bid the confirmation modal is for.
   * null = modal is closed
   * bid object = modal is open showing that bid's details
   */
  const [confirmBid, setConfirmBid] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bids", jobId],
    queryFn: () => getBidsForJob(jobId),
    enabled: !!jobId,
  });

  const bids = data?.data?.bids || [];
  const totalBids = data?.data?.totalBids || 0;

  // Reject bid mutation (unchanged from Feature 5)
  const { mutate: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: ({ bidId }) => updateBidStatus({ bidId, status: "rejected" }),
    onSuccess: () => {
      toast.success("Bid rejected");
      queryClient.invalidateQueries({ queryKey: ["bids", jobId] });
    },
    onError: (error) => toast.error(error.message || "Failed to reject bid"),
  });

  /*
   * NEW: Accept bid mutation — calls the ACID transaction endpoint.
   *
   * On success:
   * 1. Show success toast
   * 2. Clear relevant caches (bids + job updated in transaction)
   * 3. Navigate to the ContractDetailPage
   *    → contract._id comes from the response
   */
  const { mutate: handleAccept, isPending: isAccepting } = useMutation({
    mutationFn: (bidId) => acceptBid(bidId),
    onSuccess: (data) => {
      toast.success("Bid accepted! Contract created 🎉");

      // Refresh bids list (some bids are now "rejected")
      queryClient.invalidateQueries({ queryKey: ["bids", jobId] });
      // Refresh job (status is now "assigned")
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      // Refresh contracts list
      queryClient.invalidateQueries({ queryKey: ["myContracts"] });

      // Close the confirmation modal
      setConfirmBid(null);

      /*
       * Navigate to ContractDetailPage.
       * data.data.contract._id is the newly created contract's ID.
       * The client can now see the full contract details.
       */
      navigate(`/contracts/${data.data.contract._id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept bid");
      setConfirmBid(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-8 h-8 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  if (isError) {
    return <p className="py-6 text-sm text-center text-red-400">Failed to load bids</p>;
  }

  if (bids.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="font-medium text-slate-400">No bids yet</p>
        <p className="mt-1 text-sm text-slate-500">Freelancers haven't bid on this job yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Bids Received</h3>
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-violet-500/10 text-violet-400">
          {totalBids} {totalBids === 1 ? "bid" : "bids"}
        </span>
      </div>

      {/* Bid Cards */}
      <div className="space-y-4">
        {bids.map((bid) => (
          <div
            key={bid._id}
            className={`rounded-xl border p-5 transition ${
              bid.status === "accepted"
                ? "border-green-500/30 bg-green-500/5"
                : bid.status === "rejected"
                ? "border-slate-800 bg-slate-900/50 opacity-60"
                : "border-slate-800 bg-slate-900"
            }`}
          >
            {/* Freelancer Info + Amount */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 font-semibold rounded-full shrink-0 bg-violet-500/20 text-violet-400">
                  {bid.freelancer?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <Link
                    to={`/profile/${bid.freelancer?._id}`}
                    className="font-medium text-white transition hover:text-violet-400"
                  >
                    {bid.freelancer?.name}
                  </Link>
                  {bid.freelancer?.averageRating > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={11} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-yellow-400">
                        {bid.freelancer.averageRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 font-bold text-green-400">
                  <DollarSign size={14} />{bid.amount}
                </div>
                <div className="mt-1">
                  <BidStatusBadge status={bid.status} />
                </div>
              </div>
            </div>

            {/* Skills */}
            {bid.freelancer?.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {bid.freelancer.skills.slice(0, 4).map((skill) => (
                  <span key={skill} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {skill}
                  </span>
                ))}
                {bid.freelancer.skills.length > 4 && (
                  <span className="text-xs text-slate-500">
                    +{bid.freelancer.skills.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Cover Letter */}
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium tracking-wider uppercase text-slate-500">
                Cover Letter
              </p>
              <p className="text-sm leading-relaxed text-slate-300 line-clamp-3">
                {bid.coverLetter}
              </p>
            </div>

            {/*
             * Accept / Reject Buttons
             * Only show when job is open AND bid is pending.
             *
             * NEW: Accept button now opens the confirmation modal
             * instead of directly calling the API.
             * This gives the client a chance to cancel.
             */}
            {jobStatus === "open" && bid.status === "pending" && (
              <div className="flex gap-2 mt-4">
                {/* Accept → opens confirmation modal */}
                <button
                  onClick={() => setConfirmBid(bid)}
                  disabled={isAccepting || isRejecting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={14} />
                  Accept Bid
                </button>

                {/* Reject → calls reject mutation directly */}
                <button
                  onClick={() => handleReject({ bidId: bid._id })}
                  disabled={isAccepting || isRejecting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            )}

            <p className="mt-3 text-xs text-slate-600">
              Submitted {new Date(bid.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        ))}
      </div>

      {/*
       * Confirmation Modal
       * Renders outside the bid card loop so it overlays everything.
       * confirmBid is either null (hidden) or the bid object (shown).
       */}
      <ConfirmAcceptModal
        isOpen={!!confirmBid}
        onClose={() => setConfirmBid(null)}
        onConfirm={() => handleAccept(confirmBid._id)}
        bid={confirmBid}
        isPending={isAccepting}
      />
    </div>
  );
};

export default BidsListPanel;