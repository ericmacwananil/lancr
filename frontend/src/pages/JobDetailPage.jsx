import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Calendar, User, ArrowLeft, Send, FileText, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { getJobById } from "@/api/jobApi";
import { getMyContracts } from "@/api/contractApi";
import { getMyBids, freelancerRespondToCounter } from "@/api/bidApi";
import { useAuth } from "@/context/AuthContext";
import BidModal from "@/components/BidModal";
import BidsListPanel from "@/components/BidsListPanel";
import Navbar from "@/components/Navbar";

const statusColors = {
  open:         "bg-green-500/10 text-green-400 border-green-500/20",
  assigned:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  under_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  completed:    "bg-violet-500/10 text-violet-400 border-violet-500/20",
  archived:     "bg-slate-700 text-slate-400 border-slate-600",
  countered:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const CounterResponseModal = ({ isOpen, onClose, bid, onConfirm, isPending }) => {
  const [action, setAction] = useState("accept");
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
          <MessageCircle size={24} className="text-blue-400" />
        </div>

        <h3 className="text-lg font-bold text-white">Respond to Counter-Offer</h3>
        <div className="p-4 mt-3 rounded-xl bg-slate-800">
          <p className="text-sm text-slate-400">Client's Offer</p>
          <p className="text-xl font-bold text-green-400">${bid?.amount}</p>
        </div>

        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAction("accept")}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                action === "accept"
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <CheckCircle size={14} className="inline mr-1" />
              Accept
            </button>
            <button
              onClick={() => setAction("counter")}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                action === "counter"
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                  : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <MessageCircle size={14} className="inline mr-1" />
              Counter
            </button>
            <button
              onClick={() => setAction("reject")}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                action === "reject"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <XCircle size={14} className="inline mr-1" />
              Reject
            </button>
          </div>

          {action === "counter" && (
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-300">
                Your Counter Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 450"
                min="1"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}

          <div>
            <label className="block mb-1 text-sm font-medium text-slate-300">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-slate-700 py-2.5 text-slate-300 transition hover:border-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ action, amount: Number(amount), message })}
            disabled={isPending || (action === "counter" && !amount)}
            className="flex-1 rounded-lg bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Submitting..." : "Send Response"}
          </button>
        </div>
      </div>
    </div>
  );
};

const JobDetailPage = () => {
  const { jobId } = useParams();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [responseModalData, setResponseModalData] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobById(jobId),
    enabled: !!jobId,
  });
  
  const { data: contractsData } = useQuery({
    queryKey: ["myContracts"],
    queryFn: getMyContracts,
  });

  const { data: myBidsData } = useQuery({
    queryKey: ["myBids"],
    queryFn: getMyBids,
    enabled: !!currentUser,
  });

  const { mutate: handleRespond, isPending: isResponding } = useMutation({
    mutationFn: ({ bidId, action, amount, message }) => freelancerRespondToCounter({ bidId, action, amount, message }),
    onSuccess: (data) => {
      toast.success("Response sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["myBids"] });
      setResponseModalData(null);
      
      // If contract was created, navigate to contract detail page
      if (data.data?.contract?._id) {
        navigate(`/contracts/${data.data.contract._id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send response");
    },
  });

  const job = data?.data?.job;
  const myBids = myBidsData?.data?.bids || [];
  const myBidsForThisJob = myBids.filter(bid => bid.job?._id === jobId);
  const activeBid = myBidsForThisJob.find(bid => 
    bid.status === "pending" || bid.status === "accepted" || bid.status === "countered"
  );
  const hasActiveBid = !!activeBid;

  const isOwner = currentUser?._id?.toString() === job?.postedBy?._id?.toString();
  const isFreelancer = currentUser?.role === "freelancer";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-10">
          <div className="text-center">
            <p className="text-xl font-semibold text-red-400">Job not found</p>
            <Link to="/jobs" className="block mt-4 text-violet-400 hover:underline">
              ← Back to jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-4xl px-4 py-10 mx-auto">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Jobs
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="p-6 border rounded-2xl border-slate-800 bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-white">{job.title}</h1>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusColors[job.status]}`}>
                  {job.status.replace("_", " ")}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-green-400">
                  <DollarSign size={14} />
                  <span className="font-semibold">Budget: ${job.budget}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Calendar size={14} />
                  {new Date(job.createdAt).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold tracking-wider uppercase text-slate-500">
                  Description
                </h3>
                <p className="leading-relaxed whitespace-pre-wrap text-slate-300">
                  {job.description}
                </p>
              </div>

              {job.skillsRequired?.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold tracking-wider uppercase text-slate-500">
                    Skills Required
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skillsRequired.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 text-sm border rounded-full border-violet-500/30 bg-violet-500/10 text-violet-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isOwner && (
              <div className="p-6 border rounded-2xl border-slate-800 bg-slate-900">
                <BidsListPanel jobId={jobId} jobStatus={job.status} />
              </div>
            )}
            
            {isOwner && job.status === "assigned" && (() => {
              const contracts = contractsData?.data?.contracts || [];
              const contract = contracts.find(c => c.job?._id === jobId);
              
              if (contract) {
                return (
                  <div className="p-6 mt-6 border rounded-2xl border-blue-500/20 bg-blue-500/5">
                    <h3 className="mb-3 text-sm font-semibold tracking-wider uppercase text-blue-400">Contract Created</h3>
                    <p className="mb-4 text-sm text-slate-300">
                      A contract has been created with the freelancer! Click below to view and fund it.
                    </p>
                    <Link
                      to={`/contracts/${contract._id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition rounded-lg bg-violet-600 hover:bg-violet-700"
                    >
                      <FileText size={16} />
                      View Contract & Pay Now
                    </Link>
                  </div>
                );
              }
              return null;
            })()}

          </div>

          <div className="space-y-4">
            <div className="p-5 border rounded-2xl border-slate-800 bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold tracking-wider uppercase text-slate-500">
                Posted By
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 font-semibold rounded-full bg-violet-500/20 text-violet-400">
                  {job.postedBy?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{job.postedBy?.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <User size={10} className="text-slate-500" />
                    <span className="text-xs text-slate-500">Client</span>
                  </div>
                </div>
              </div>
              <Link
                to={`/profile/${job.postedBy?._id}`}
                className="block w-full py-2 mt-4 text-sm text-center transition border rounded-lg border-slate-700 text-slate-300 hover:border-violet-500 hover:text-violet-400"
              >
                View Profile
              </Link>
            </div>

            {isFreelancer && job.status === "open" && !isOwner && !hasActiveBid && (
              <div className="p-5 border rounded-2xl border-slate-800 bg-slate-900">
                <h3 className="mb-3 text-sm font-semibold tracking-wider uppercase text-slate-500">
                  {myBidsForThisJob.length > 0 ? "Counter Offer?" : "Interested?"}
                </h3>
                <button
                  onClick={() => setIsBidModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  <Send size={14} />
                  {myBidsForThisJob.length > 0 ? "Place a Counter Bid" : "Place a Bid"}
                </button>
              </div>
            )}

            {isFreelancer && job.status === "open" && !isOwner && hasActiveBid && (
              <div className="p-5 border rounded-2xl border-slate-800 bg-slate-900">
                <h3 className="mb-1 text-sm font-semibold tracking-wider uppercase text-slate-500">
                  Your Bid
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-green-400">${activeBid.amount}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    activeBid.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                    activeBid.status === "countered" ? "bg-blue-500/10 text-blue-400" :
                    "bg-green-500/10 text-green-400"
                  }`}>
                    {activeBid.status}
                  </span>
                </div>

                {activeBid.negotiationHistory && activeBid.negotiationHistory.length > 1 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">Negotiation History:</p>
                    <div className="space-y-1">
                      {activeBid.negotiationHistory.slice(-3).map((item, idx) => (
                        <div key={idx} className="text-xs text-slate-400">
                          <span className="text-slate-300">{item.offeredBy === "client" ? "Client" : "You"}</span>: $
                          {item.amount}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeBid.status === "countered" && activeBid.lastOfferBy === "client" && (
                  <button
                    onClick={() => setResponseModalData(activeBid)}
                    className="w-full mt-3 py-2 text-sm font-semibold text-white transition rounded-lg bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageCircle size={14} className="inline mr-1" />
                    Respond to Counter-Offer
                  </button>
                )}
              </div>
            )}

            {job.status !== "open" && (
              <div className="p-5 text-center border rounded-2xl border-slate-700 bg-slate-900/50">
                <p className="text-sm text-slate-400">
                  This job is no longer accepting bids
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      <BidModal
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        job={job}
      />

      {responseModalData && (
        <CounterResponseModal
          isOpen={!!responseModalData}
          onClose={() => setResponseModalData(null)}
          bid={responseModalData}
          onConfirm={({ action, amount, message }) =>
            handleRespond({ bidId: responseModalData._id, action, amount, message })
          }
          isPending={isResponding}
        />
      )}
    </div>
  );
};

export default JobDetailPage;