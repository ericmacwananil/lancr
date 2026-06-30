import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, DollarSign, Clock,
  CheckCircle, FileText, Upload
} from "lucide-react";

import { getMyContracts } from "@/api/contractApi";
import { useAuth } from "@/context/AuthContext";
import SubmitWorkModal from "@/components/SubmitWorkModal";
import Navbar from "@/components/Navbar";

/*
 * WHAT IS THIS PAGE?
 * The freelancer's personal dashboard.
 * Shows all contracts where they are the assigned freelancer.
 * For each "funded" contract, they can submit their work.
 */

// ─── Status Config ────────────────────────────────────────────
/*
 * Maps each contract status to a color and icon.
 * Keeps the JSX clean — no big if/else chains.
 */
const statusConfig = {
  pending_payment: {
    color: "bg-slate-700 text-slate-300",
    label: "Awaiting Payment",
    icon: <Clock size={12} />,
  },
  funded: {
    color: "bg-blue-500/10 text-blue-400",
    label: "Ready to Work",
    icon: <DollarSign size={12} />,
  },
  under_review: {
    color: "bg-yellow-500/10 text-yellow-400",
    label: "Under Review",
    icon: <FileText size={12} />,
  },
  completed: {
    color: "bg-green-500/10 text-green-400",
    label: "Completed",
    icon: <CheckCircle size={12} />,
  },
};


// ─── Contract Card ────────────────────────────────────────────
/*
 * Displays one contract as a card.
 * Props:
 * - contract     → the contract object
 * - onSubmitWork → function to call when "Submit Work" is clicked
 */
const ContractCard = ({ contract, onSubmitWork }) => {
  const config = statusConfig[contract.status] || statusConfig.pending_payment;

  return (
    <div className={`rounded-xl border bg-slate-900 p-5 transition ${
      contract.status === "funded"
        ? "border-blue-500/30"   // highlight funded contracts (action needed)
        : "border-slate-800"
    }`}>

      {/* Header: Job Title + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white line-clamp-1">
            {contract.job?.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Client: {contract.client?.name}
          </p>
        </div>

        {/* Status Badge */}
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
          {config.icon}
          {config.label}
        </span>
      </div>

      {/* Agreed Amount */}
      <div className="mt-4 flex items-center gap-1.5">
        <DollarSign size={14} className="text-green-400" />
        <span className="text-lg font-bold text-green-400">
          {contract.agreedAmount}
        </span>
        <span className="text-xs text-slate-500">agreed amount</span>
      </div>

      {/* Delivery File Link — shown after submission */}
      {contract.deliveryFile && (
        <div className="flex items-center gap-2 px-3 py-2 mt-3 rounded-lg bg-slate-800">
          <FileText size={14} className="text-violet-400" />
          
          <a
            href={contract.deliveryFile}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-violet-400 hover:underline"
          >
            View Submitted File
          </a>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        {/* View Contract Button */}
        <Link
          to={`/contracts/${contract._id}`}
          className="flex-1 py-2 text-sm text-center transition border rounded-lg border-slate-700 text-slate-300 hover:border-slate-600"
        >
          View Details
        </Link>

        {/*
         * Submit Work Button — ONLY show if contract is "funded".
         * funded = client paid, freelancer can now submit work.
         * Any other status → this button is hidden.
         */}
        {contract.status === "funded" && (
          <button
            onClick={() => onSubmitWork(contract)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            <Upload size={14} />
            Submit Work
          </button>
        )}
      </div>

      {/* Date */}
      <p className="mt-3 text-xs text-slate-600">
        Started {new Date(contract.createdAt).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        })}
      </p>
    </div>
  );
};


// ─── Main Dashboard Page ──────────────────────────────────────
const FreelancerDashboard = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  /*
   * selectedContract: which contract's "Submit Work" modal is open.
   * null = modal is closed.
   * contract object = modal is open for that contract.
   */
  const [selectedContract, setSelectedContract] = useState(null);

  /*
   * Fetch all contracts for the logged-in freelancer.
   * getMyContracts() returns contracts where user is freelancer OR client.
   * Since this is the FreelancerDashboard, we filter for only
   * contracts where they are the freelancer.
   */
  const { data, isLoading } = useQuery({
    queryKey: ["myContracts"],
    queryFn: getMyContracts,
  });

  const allContracts = data?.data?.contracts || [];

  /*
   * Filter to show only contracts where the logged-in user
   * is the FREELANCER (not the client).
   */
  const myContracts = allContracts.filter(
    (c) => c.freelancer?._id?.toString() === currentUser?._id?.toString()
  );

  // After successful submission, refresh contracts and close modal
  const handleSubmitSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["myContracts"] });
    setSelectedContract(null);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-4xl px-4 py-10 mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Work</h1>
          <p className="mt-1 text-slate-400">
            Welcome back, {currentUser?.name}
          </p>
        </div>

        {/* Earnings + Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          {[
            {
              label: "Total Earnings",
              value: `$${currentUser?.earnings?.toFixed(2) || "0.00"}`,
              color: "text-green-400",
            },
            {
              label: "Active",
              value: myContracts.filter((c) => c.status === "funded").length,
              color: "text-blue-400",
            },
            {
              label: "Under Review",
              value: myContracts.filter((c) => c.status === "under_review").length,
              color: "text-yellow-400",
            },
            {
              label: "Completed",
              value: myContracts.filter((c) => c.status === "completed").length,
              color: "text-violet-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="p-4 border rounded-xl border-slate-800 bg-slate-900">
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className={`mt-1 text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Contracts Sections */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
          </div>
        ) : myContracts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Briefcase size={48} className="mb-4 text-slate-700" />
            <p className="text-xl font-semibold text-slate-400">No contracts yet</p>
            <p className="mt-2 text-slate-500">
              Browse jobs and place bids to get started
            </p>
            <Link
              to="/jobs"
              className="mt-6 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div>
            {/*
             * Show "Action Needed" contracts first (funded ones).
             * These need the freelancer to submit work.
             */}
            {myContracts.some((c) => c.status === "funded") && (
              <div className="mb-8">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold text-white">
                  <span className="w-2 h-2 bg-blue-400 rounded-full" />
                  Action Needed
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {myContracts
                    .filter((c) => c.status === "funded")
                    .map((contract) => (
                      <ContractCard
                        key={contract._id}
                        contract={contract}
                        onSubmitWork={setSelectedContract}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* All other contracts */}
            {myContracts.some((c) => c.status !== "funded") && (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-white">
                  All Contracts
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {myContracts
                    .filter((c) => c.status !== "funded")
                    .map((contract) => (
                      <ContractCard
                        key={contract._id}
                        contract={contract}
                        onSubmitWork={setSelectedContract}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/*
       * SubmitWorkModal sits outside the grid.
       * isOpen = true only when selectedContract is not null.
       * onClose = clear selectedContract (closes modal).
       */}
      <SubmitWorkModal
        isOpen={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        contract={selectedContract}
        onSuccess={handleSubmitSuccess}
      />
    </div>
  );
};

export default FreelancerDashboard;