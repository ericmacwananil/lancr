import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Briefcase, DollarSign, Trash2, Eye } from "lucide-react";

import { getMyJobs, deleteJob } from "@/api/jobApi";
import { useAuth } from "@/context/AuthContext";

/*
 * WHAT IS THIS PAGE?
 * The client's personal dashboard.
 * Shows only the jobs THEY posted.
 * Allows them to view, and delete their jobs.
 */

// ─── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    open: "bg-green-500/10 text-green-400",
    assigned: "bg-blue-500/10 text-blue-400",
    under_review: "bg-yellow-500/10 text-yellow-400",
    completed: "bg-violet-500/10 text-violet-400",
    archived: "bg-slate-700 text-slate-400",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const ClientDashboard = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  /*
   * Fetch only this client's jobs.
   * queryKey: ["myJobs"] — separate cache from the public feed.
   */
  const { data, isLoading } = useQuery({
    queryKey: ["myJobs"],
    queryFn: getMyJobs,
  });

  const jobs = data?.data?.jobs || [];

  // Delete job mutation
  const { mutate: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      toast.success("Job deleted");
      // Refresh the list after deleting
      queryClient.invalidateQueries({ queryKey: ["myJobs"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete job");
    },
  });

  const confirmDelete = (jobId) => {
    /*
     * window.confirm() shows a browser popup asking "Are you sure?"
     * Returns true if user clicks OK, false if they click Cancel.
     * Simple but effective for destructive actions.
     */
    if (window.confirm("Are you sure you want to delete this job?")) {
      handleDelete(jobId);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 bg-slate-950">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Jobs</h1>
            <p className="mt-1 text-slate-400">
              Welcome back, {currentUser?.name}
            </p>
          </div>
          {/* Post New Job Button */}
          <Link
            to="/post-job"
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <Plus size={16} />
            Post New Job
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          {[
            { label: "Total Jobs", value: jobs.length, color: "text-white" },
            { label: "Open", value: jobs.filter(j => j.status === "open").length, color: "text-green-400" },
            { label: "Active", value: jobs.filter(j => j.status === "assigned").length, color: "text-blue-400" },
            { label: "Completed", value: jobs.filter(j => j.status === "completed").length, color: "text-violet-400" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 border rounded-xl border-slate-800 bg-slate-900">
              <p className="text-sm text-slate-400">{stat.label}</p>
              <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && jobs.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <Briefcase size={48} className="mb-4 text-slate-700" />
            <p className="text-xl font-semibold text-slate-400">No jobs posted yet</p>
            <p className="mt-2 text-slate-500">Post your first job and get bids from freelancers</p>
            <Link
              to="/post-job"
              className="mt-6 flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus size={16} />
              Post a Job
            </Link>
          </div>
        )}

        {/* Jobs Table */}
        {jobs.length > 0 && (
          <div className="overflow-hidden border rounded-2xl border-slate-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">
                    Job Title
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">
                    Budget
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-400">
                    Posted
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-right uppercase text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {jobs.map((job) => (
                  <tr key={job._id} className="transition hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-white line-clamp-1">{job.title}</p>
                      {/* Show assigned freelancer if job is active */}
                      {job.assignedTo && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Assigned to: {job.assignedTo.name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-green-400">
                        <DollarSign size={13} />
                        <span className="font-medium">{job.budget}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Button */}
                        <Link
                          to={`/jobs/${job._id}`}
                          className="p-2 transition rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                          title="View job"
                        >
                          <Eye size={15} />
                        </Link>
                        {/* Delete Button — only for open jobs */}
                        {job.status === "open" && (
                          <button
                            onClick={() => confirmDelete(job._id)}
                            disabled={isDeleting}
                            className="p-2 transition rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                            title="Delete job"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClientDashboard;