import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Calendar, User, ArrowLeft, Send } from "lucide-react";

import { getJobById } from "@/api/jobApi";
import { useAuth } from "@/context/AuthContext";
import BidModal from "@/components/BidModal";           // ← ADD
import BidsListPanel from "@/components/BidsListPanel"; // ← ADD

const statusColors = {
  open:         "bg-green-500/10 text-green-400 border-green-500/20",
  assigned:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  under_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  completed:    "bg-violet-500/10 text-violet-400 border-violet-500/20",
  archived:     "bg-slate-700 text-slate-400 border-slate-600",
};

const JobDetailPage = () => {
  const { jobId } = useParams();
  const { currentUser } = useAuth();

  // Controls whether BidModal is open
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobById(jobId),
    enabled: !!jobId,
  });

  const job = data?.data?.job;

  const isOwner = currentUser?._id?.toString() === job?.postedBy?._id?.toString();
  const isFreelancer = currentUser?.role === "freelancer";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-400">Job not found</p>
          <Link to="/jobs" className="block mt-4 text-violet-400 hover:underline">
            ← Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 bg-slate-950">
      <div className="max-w-4xl mx-auto">

        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Jobs
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left: Job Info ────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">

            {/* Job Header */}
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

            {/*
             * BIDS SECTION
             * Show BidsListPanel to the client (job owner)
             * Show nothing to freelancers here (they use the sidebar button)
             */}
            {isOwner && (
              <div className="p-6 border rounded-2xl border-slate-800 bg-slate-900">
                <BidsListPanel jobId={jobId} jobStatus={job.status} />
              </div>
            )}

          </div>

          {/* ── Right: Sidebar ────────────────────────────── */}
          <div className="space-y-4">

            {/* Posted By */}
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

            {/*
             * FREELANCER ACTION CARD
             * Show "Place a Bid" button if:
             * 1. Logged in user is a freelancer
             * 2. The job is still open
             * 3. They are NOT the one who posted the job
             */}
            {isFreelancer && job.status === "open" && !isOwner && (
              <div className="p-5 border rounded-2xl border-slate-800 bg-slate-900">
                <h3 className="mb-3 text-sm font-semibold tracking-wider uppercase text-slate-500">
                  Interested?
                </h3>
                <button
                  onClick={() => setIsBidModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  <Send size={14} />
                  Place a Bid
                </button>
              </div>
            )}

            {/* Job no longer open message */}
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

      {/*
       * BidModal sits outside the grid so it overlays the full page.
       * isOpen controls visibility.
       * onClose hides it.
       * job passes job data (for job title and budget display).
       */}
      <BidModal
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        job={job}
      />
    </div>
  );
};

export default JobDetailPage;