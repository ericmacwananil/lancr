import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, MessageSquare } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { getBidsForJob, updateBidStatus, clientCounterOffer } from "@/api/bidApi";
import { acceptBid } from "@/api/contractApi";

const BidStatusBadge = ({ status }) => {
  const config = {
    pending:  { color: "bg-yellow-500/10 text-yellow-400", icon: <Clock size={11} /> },
    accepted: { color: "bg-green-500/10 text-green-400",  icon: <CheckCircle size={11} /> },
    rejected: { color: "bg-red-500/10 text-red-400",      icon: <XCircle size={11} /> },
    countered: { color: "bg-blue-500/10 text-blue-400",   icon: <MessageSquare size={11} /> },
  };
  const { color, icon } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {icon}{status}
    </span>
  );
};

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
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-green-500/10">
          <AlertTriangle size={24} className="text-green-400" />
        </div>

        <h3 className="text-lg font-bold text-white">Accept this bid?</h3>
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

const CounterOfferModal = ({ isOpen, onClose, onConfirm, bid, isPending }) => {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 border rounded-2xl border-slate-700 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-500/10">
          <MessageSquare size={24} className="text-blue-400" />
        </div>

        <h3 className="text-lg font-bold text-white">Make a counter-offer</h3>
        <div className="p-4 mt-3 rounded-xl bg-slate-800">
          <p className="text-sm text-slate-400">Current Bid Amount</p>
          <p className="text-xl font-bold text-green-400">${bid?.amount}</p>
        </div>

        <form className="space-y-4 mt-4" onSubmit={(e) => {
          e.preventDefault();
          if (!amount) return;
          onConfirm({ amount: Number(amount), message });
        }}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Your counter-offer amount</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 400"
                min="1"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your counter-offer..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-slate-300 transition hover:border-slate-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !amount}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Sending..." : "Send Counter-Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BidsListPanel = ({ jobId, jobStatus }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [confirmBid, setConfirmBid] = useState(null);
  const [counterBid, setCounterBid] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bids", jobId],
    queryFn: () => getBidsForJob(jobId),
    enabled: !!jobId,
  });

  const bids = data?.data?.bids || [];
  const totalBids = data?.data?.totalBids || 0;

  const { mutate: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: ({ bidId }) => updateBidStatus({ bidId, status: "rejected" }),
    onSuccess: () => {
      toast.success("Bid rejected");
      queryClient.invalidateQueries({ queryKey: ["bids", jobId] });
    },
    onError: (error) => toast.error(error.message || "Failed to reject bid"),
  });

  const { mutate: handleAccept, isPending: isAccepting } = useMutation({
    mutationFn: (bidId) => acceptBid(bidId),
    onSuccess: (data) => {
      toast.success("Bid accepted! Contract created 🎉");
      queryClient.invalidateQueries({ queryKey: ["bids", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["myContracts"] });
      setConfirmBid(null);
      navigate(`/contracts/${data.data.contract._id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept bid");
      setConfirmBid(null);
    },
  });

  const { mutate: handleCounterOffer, isPending: isCountering } = useMutation({
    mutationFn: ({ bidId, amount, message }) => clientCounterOffer({ bidId, amount, message }),
    onSuccess: () => {
      toast.success("Counter-offer sent!");
      queryClient.invalidateQueries({ queryKey: ["bids", jobId] });
      setCounterBid(null);
    },
    onError: (error) => toast.error(error.message || "Failed to send counter-offer"),
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Bids Received</h3>
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-violet-500/10 text-violet-400">
          {totalBids} {totalBids === 1 ? "bid" : "bids"}
        </span>
      </div>

      <div className="space-y-4">
        {bids.map((bid) => (
          <div
            key={bid._id}
            className={`rounded-xl border p-5 transition ${
              bid.status === "accepted"
                ? "border-green-500/30 bg-green-500/5"
                : bid.status === "rejected"
                ? "border-slate-800 bg-slate-900/50 opacity-60"
                : bid.status === "countered"
                ? "border-blue-500/30 bg-blue-500/5"
                : "border-slate-800 bg-slate-900"
            }`}
          >
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

            {bid.negotiationHistory && bid.negotiationHistory.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium tracking-wider uppercase text-slate-500">
                  Negotiation History
                </p>
                <div className="space-y-2">
                  {bid.negotiationHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        item.offeredBy === "client"
                          ? "border-blue-500/30 bg-blue-500/5"
                          : "border-violet-500/30 bg-violet-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">
                          {item.offeredBy === "client" ? "You" : bid.freelancer?.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          ${item.amount}
                        </span>
                      </div>
                      {item.message && (
                        <p className="text-sm text-slate-400">{item.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="mb-1 text-xs font-medium tracking-wider uppercase text-slate-500">
                Cover Letter
              </p>
              <p className="text-sm leading-relaxed text-slate-300 line-clamp-3">
                {bid.coverLetter}
              </p>
            </div>

            {jobStatus === "open" && (bid.status === "pending" || bid.status === "countered") && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setConfirmBid(bid)}
                  disabled={isAccepting || isRejecting || isCountering}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={14} />
                  Accept Bid
                </button>

                <button
                  onClick={() => setCounterBid(bid)}
                  disabled={isAccepting || isRejecting || isCountering}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/10 disabled:opacity-50"
                >
                  <MessageSquare size={14} />
                  Counter
                </button>

                <button
                  onClick={() => handleReject({ bidId: bid._id })}
                  disabled={isAccepting || isRejecting || isCountering}
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

      <ConfirmAcceptModal
        isOpen={!!confirmBid}
        onClose={() => setConfirmBid(null)}
        onConfirm={() => handleAccept(confirmBid._id)}
        bid={confirmBid}
        isPending={isAccepting}
      />

      <CounterOfferModal
        isOpen={!!counterBid}
        onClose={() => setCounterBid(null)}
        onConfirm={({ amount, message }) => handleCounterOffer({ bidId: counterBid._id, amount, message })}
        bid={counterBid}
        isPending={isCountering}
      />
    </div>
  );
};

export default BidsListPanel;
