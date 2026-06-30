import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Users, Briefcase, FileText,
  DollarSign, Trash2, Shield,
  TrendingUp, CheckCircle, AlertCircle,
  XCircle, Check, ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";

import {
  getRefundRequests,
  approveRefund,
  rejectRefund,
} from "@/api/contractApi";

import {
  getAdminStats,
  getAllUsers,
  getAllJobs,
  getAllContracts,
  deleteUser,
  deleteJob,
} from "@/api/adminApi";

/*
 * WHAT IS THIS PAGE?
 * The admin control panel. Only users with role="admin" can access.
 * Protected in App.jsx with requiredRole="admin".
 *
 * Layout:
 * 1. Stats row at top (4 numbers)
 * 2. Tab bar (Users | Jobs | Contracts)
 * 3. Data table for the active tab
 */


// ─── Stat Card ────────────────────────────────────────────────
/*
 * Reusable stat card component for the top row.
 * Props: label, value, icon, color
 */
const StatCard = ({ label, value, icon, color }) => (
  <div className="p-5 border rounded-2xl border-slate-800 bg-slate-900">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} bg-current/10 opacity-80`}>
        {icon}
      </div>
    </div>
  </div>
);


// ─── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    open:            "bg-green-500/10 text-green-400",
    assigned:        "bg-blue-500/10 text-blue-400",
    under_review:    "bg-yellow-500/10 text-yellow-400",
    completed:       "bg-violet-500/10 text-violet-400",
    archived:        "bg-slate-700 text-slate-400",
    pending_payment: "bg-orange-500/10 text-orange-400",
    funded:          "bg-blue-500/10 text-blue-400",
    refund_requested: "bg-orange-500/10 text-orange-400",
    refunded:        "bg-red-500/10 text-red-400",
    client:          "bg-blue-500/10 text-blue-400",
    freelancer:      "bg-green-500/10 text-green-400",
    admin:           "bg-red-500/10 text-red-400",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] || "bg-slate-700 text-slate-400"}`}>
      {status?.replace("_", " ")}
    </span>
  );
};


// ─── Confirm Delete Modal ─────────────────────────────────────
/*
 * Simple confirmation modal for delete actions.
 * Prevents accidental deletes.
 */
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, itemName, isPending }) => {
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
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-red-500/10">
          <Trash2 size={22} className="text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Confirm Delete</h3>
        <p className="mt-2 text-sm text-slate-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-white">{itemName}</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-slate-700 py-2.5 text-slate-300 hover:border-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ─── Users Tab ────────────────────────────────────────────────
const UsersTab = () => {
  const queryClient = useQueryClient();
  const [confirmItem, setConfirmItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: getAllUsers,
  });

  const users = data?.data?.users || [];

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setConfirmItem(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
      setConfirmItem(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden border rounded-xl border-slate-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Name</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Email</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Role</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Earnings</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Joined</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-right uppercase text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {users.map((user) => (
              <tr key={user._id} className="transition hover:bg-slate-800/40">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar initial */}
                    <div className="flex items-center justify-center w-8 h-8 text-xs font-semibold rounded-full bg-violet-500/20 text-violet-400">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <Link
                      to={`/profile/${user._id}`}
                      className="font-medium text-white hover:text-violet-400"
                    >
                      {user.name}
                    </Link>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">{user.email}</td>
                <td className="px-5 py-4"><StatusBadge status={user.role} /></td>
                <td className="px-5 py-4 text-sm text-green-400">
                  ${user.earnings?.toFixed(2) || "0.00"}
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4 text-right">
                  {/*
                   * Don't show delete for admin accounts.
                   * Prevents removing admin access accidentally.
                   */}
                  {user.role !== "admin" && (
                    <button
                      onClick={() => setConfirmItem(user)}
                      className="p-2 transition rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                      title="Delete user"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-12 text-center text-slate-500">No users found</div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={() => handleDelete(confirmItem._id)}
        itemName={confirmItem?.name}
        isPending={isPending}
      />
    </>
  );
};


// ─── Jobs Tab ─────────────────────────────────────────────────
const JobsTab = () => {
  const queryClient = useQueryClient();
  const [confirmItem, setConfirmItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["adminJobs"],
    queryFn: getAllJobs,
  });

  const jobs = data?.data?.jobs || [];

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      toast.success("Job deleted");
      queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setConfirmItem(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete job");
      setConfirmItem(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden border rounded-xl border-slate-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Title</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Posted By</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Budget</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Status</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Date</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-right uppercase text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {jobs.map((job) => (
              <tr key={job._id} className="transition hover:bg-slate-800/40">
                <td className="px-5 py-4">
                  <Link
                    to={`/jobs/${job._id}`}
                    className="font-medium text-white line-clamp-1 hover:text-violet-400"
                  >
                    {job.title}
                  </Link>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {job.postedBy?.name}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <DollarSign size={12} />
                    {job.budget}
                  </div>
                </td>
                <td className="px-5 py-4"><StatusBadge status={job.status} /></td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {new Date(job.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => setConfirmItem(job)}
                    className="p-2 transition rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                    title="Delete job"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {jobs.length === 0 && (
          <div className="py-12 text-center text-slate-500">No jobs found</div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={() => handleDelete(confirmItem._id)}
        itemName={confirmItem?.title}
        isPending={isPending}
      />
    </>
  );
};


// ─── Contracts Tab ────────────────────────────────────────────
const ContractsTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["adminContracts"],
    queryFn: getAllContracts,
  });

  const contracts = data?.data?.contracts || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden border rounded-xl border-slate-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/50">
            <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Job</th>
            <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Client</th>
            <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Freelancer</th>
            <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Amount</th>
            <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Status</th>
            <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-900">
          {contracts.map((contract) => (
            <tr key={contract._id} className="transition hover:bg-slate-800/40">
              <td className="px-5 py-4">
                <Link
                  to={`/contracts/${contract._id}`}
                  className="font-medium text-white line-clamp-1 hover:text-violet-400"
                >
                  {contract.job?.title || "N/A"}
                </Link>
              </td>
              <td className="px-5 py-4 text-sm text-slate-400">
                {contract.client?.name}
              </td>
              <td className="px-5 py-4 text-sm text-slate-400">
                {contract.freelancer?.name}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-1 text-sm text-green-400">
                  <DollarSign size={12} />
                  {contract.agreedAmount}
                </div>
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={contract.status} />
              </td>
              <td className="px-5 py-4 text-sm text-slate-400">
                {new Date(contract.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {contracts.length === 0 && (
        <div className="py-12 text-center text-slate-500">No contracts found</div>
      )}
    </div>
  );
};

// ─── Refund Decision Modal ─────────────────────────────────────
const RefundDecisionModal = ({ isOpen, onClose, onConfirm, contract, decision, isPending }) => {
  const [adminNotes, setAdminNotes] = useState("");

  if (!isOpen) return null;

  const isApproval = decision === "approve";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 border rounded-2xl border-slate-700 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-center w-12 h-12 mb-4 rounded-full ${isApproval ? "bg-red-500/10" : "bg-green-500/10"}`}>
          {isApproval ? (
            <XCircle size={22} className="text-red-400" />
          ) : (
            <Check size={22} className="text-green-400" />
          )}
        </div>

        <h3 className="text-lg font-bold text-white">
          {isApproval ? "Approve Refund?" : "Reject Refund?"}
        </h3>

        <div className="mt-3 p-4 rounded-xl bg-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Job</span>
            <span className="text-sm font-medium text-white">{contract?.job?.title}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Amount</span>
            <span className="text-sm font-medium text-green-400">${contract?.agreedAmount}</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="block mb-2 text-sm text-slate-300">
            Admin Notes (optional)
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any notes about this decision..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[100px]"
          />
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
            onClick={() => onConfirm(adminNotes)}
            disabled={isPending}
            className={`flex-1 rounded-lg py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
              isApproval ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {isPending ? "Processing..." : isApproval ? "Approve Refund" : "Reject Refund"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ─── Refunds Tab ───────────────────────────────────────────────
const RefundsTab = () => {
  const queryClient = useQueryClient();
  const [modalConfig, setModalConfig] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["adminRefundRequests"],
    queryFn: getRefundRequests,
  });

  const contracts = data?.data?.contracts || [];

  const { mutate: handleApprove, isPending: isApproving } = useMutation({
    mutationFn: ({ contractId, adminNotes }) => approveRefund(contractId, adminNotes),
    onSuccess: () => {
      toast.success("Refund approved");
      queryClient.invalidateQueries({ queryKey: ["adminRefundRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setModalConfig(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve refund");
      setModalConfig(null);
    },
  });

  const { mutate: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: ({ contractId, adminNotes }) => rejectRefund(contractId, adminNotes),
    onSuccess: () => {
      toast.success("Refund rejected, funds released to freelancer");
      queryClient.invalidateQueries({ queryKey: ["adminRefundRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setModalConfig(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject refund");
      setModalConfig(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden border rounded-xl border-slate-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Job</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Client</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Freelancer</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Amount</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Reason</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">Date</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-right uppercase text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {contracts.map((contract) => (
              <tr key={contract._id} className="transition hover:bg-slate-800/40">
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <Link
                      to={`/contracts/${contract._id}`}
                      className="font-medium text-white hover:text-violet-400"
                    >
                      {contract.job?.title || "N/A"}
                    </Link>
                    {contract.deliveryFile && (
                      <a
                        href={contract.deliveryFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-400"
                      >
                        <FileText size={10} />
                        View work
                        <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {contract.client?.name}
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {contract.freelancer?.name}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <DollarSign size={12} />
                    {contract.agreedAmount}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {contract.refundReason || "No reason provided"}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {contract.refundRequestedAt ? (
                    new Date(contract.refundRequestedAt).toLocaleDateString()
                  ) : "N/A"}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setModalConfig({ contract, decision: "approve" })}
                      disabled={isApproving || isRejecting}
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setModalConfig({ contract, decision: "reject" })}
                      disabled={isApproving || isRejecting}
                      className="px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contracts.length === 0 && (
          <div className="py-12 text-center text-slate-500">No refund requests found</div>
        )}
      </div>

      {modalConfig && (
        <RefundDecisionModal
          isOpen={!!modalConfig}
          onClose={() => setModalConfig(null)}
          onConfirm={(adminNotes) => {
            if (modalConfig.decision === "approve") {
              handleApprove({
                contractId: modalConfig.contract._id,
                adminNotes,
              });
            } else {
              handleReject({
                contractId: modalConfig.contract._id,
                adminNotes,
              });
            }
          }}
          contract={modalConfig.contract}
          decision={modalConfig.decision}
          isPending={modalConfig.decision === "approve" ? isApproving : isRejecting}
        />
      )}
    </>
  );
};


// ─── Main Admin Dashboard Page ────────────────────────────────
const AdminDashboard = () => {
  /*
   * activeTab controls which table is shown.
   * "users" | "jobs" | "contracts"
   */
  const [activeTab, setActiveTab] = useState("users");

  // Fetch platform stats for the top row
  const { data: statsData } = useQuery({
    queryKey: ["adminStats"],
    queryFn: getAdminStats,
  });

  const stats = statsData?.data;

  const tabs = [
    { key: "users",     label: "Users",     icon: <Users size={15} /> },
    { key: "jobs",      label: "Jobs",      icon: <Briefcase size={15} /> },
    { key: "contracts", label: "Contracts", icon: <FileText size={15} /> },
    { key: "refunds",   label: "Refunds",   icon: <AlertCircle size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10">
              <Shield size={20} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-slate-400">Platform management and overview</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers || 0}
            icon={<Users size={20} className="text-violet-400" />}
            color="text-violet-400"
          />
          <StatCard
            label="Active Jobs"
            value={stats?.activeJobs || 0}
            icon={<Briefcase size={20} className="text-blue-400" />}
            color="text-blue-400"
          />
          <StatCard
            label="Total Contracts"
            value={stats?.totalContracts || 0}
            icon={<FileText size={20} className="text-yellow-400" />}
            color="text-yellow-400"
          />
          <StatCard
            label="Earnings Released"
            value={`$${stats?.totalEarningsReleased?.toLocaleString() || "0"}`}
            icon={<DollarSign size={20} className="text-green-400" />}
            color="text-green-400"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 mb-8 sm:grid-cols-2">
          <div className="flex items-center gap-4 p-4 border rounded-xl border-slate-800 bg-slate-900">
            <TrendingUp size={18} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Total Jobs Posted</p>
              <p className="font-semibold text-white">{stats?.totalJobs || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 border rounded-xl border-slate-800 bg-slate-900">
            <CheckCircle size={18} className="text-green-400" />
            <div>
              <p className="text-xs text-slate-500">Completed Contracts</p>
              <p className="font-semibold text-white">{stats?.completedContracts || 0}</p>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 mb-6 border rounded-xl border-slate-800 bg-slate-900 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-violet-600 text-white"         // active tab
                  : "text-slate-400 hover:text-white"  // inactive tab
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {/*
         * Conditional rendering based on activeTab.
         * Only the active tab's component is mounted.
         * When you switch tabs, the old component unmounts
         * and the new one mounts + fetches its data.
         */}
        {activeTab === "users"     && <UsersTab />}
        {activeTab === "jobs"      && <JobsTab />}
        {activeTab === "contracts" && <ContractsTab />}
        {activeTab === "refunds"   && <RefundsTab />}

      </div>
    </div>
  );
};

export default AdminDashboard;