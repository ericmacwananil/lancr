import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Briefcase, DollarSign, Clock } from "lucide-react";

import { getAllJobs } from "@/api/jobApi";
import Navbar from "@/components/Navbar";

/*
 * WHAT IS THIS PAGE?
 * The main job feed — freelancers browse all open jobs here.
 * Features: search by keyword, filter by status, pagination.
 */

// ─── Job Card Component ───────────────────────────────────────
/*
 * A small reusable component that displays one job.
 * We define it here since it's only used on this page.
 * Props: job → the job object from the API
 */
const JobCard = ({ job }) => {
  /*
   * Date formatting:
   * job.createdAt is a string like "2024-01-15T10:30:00.000Z"
   * new Date() converts it to a Date object.
   * toLocaleDateString() formats it nicely: "Jan 15, 2024"
   */
  const postedDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-6 transition border rounded-xl border-slate-800 bg-slate-900 hover:border-violet-500/50">

      {/* Job Title + Status Badge */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-white line-clamp-2">
          {job.title}
        </h3>
        {/* Status badge with color based on status */}
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
          job.status === "open"
            ? "bg-green-500/10 text-green-400"
            : "bg-slate-700 text-slate-400"
        }`}>
          {job.status}
        </span>
      </div>

      {/* Description Preview */}
      {/*
       * line-clamp-3 limits text to 3 lines.
       * This keeps all cards the same height in the grid.
       */}
      <p className="mt-3 text-sm text-slate-400 line-clamp-3">
        {job.description}
      </p>

      {/* Skills Required */}
      {job.skillsRequired?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {job.skillsRequired.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Budget, Date, Posted By */}
      <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-800">
        <div className="flex items-center gap-4">
          {/* Budget */}
          <div className="flex items-center gap-1.5 text-sm text-green-400">
            <DollarSign size={14} />
            <span className="font-semibold">{job.budget}</span>
          </div>
          {/* Posted date */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            {postedDate}
          </div>
        </div>

        {/* Posted By */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 text-xs rounded-full bg-violet-500/20 text-violet-400">
            {job.postedBy?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-xs text-slate-400">
            {job.postedBy?.name}
          </span>
        </div>
      </div>

      {/* View Details Button */}
      <Link
        to={`/jobs/${job._id}`}
        className="block w-full py-2 mt-4 text-sm text-center transition border rounded-lg border-slate-700 text-slate-300 hover:border-violet-500 hover:text-violet-400"
      >
        View Details
      </Link>
    </div>
  );
};


// ─── Main Job Feed Page ───────────────────────────────────────
const JobFeedPage = () => {
  // Search and filter state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /*
   * useQuery fetches jobs from the backend.
   *
   * queryKey: ["jobs", { search, page }]
   * → When search or page changes, React Query automatically
   *   re-fetches with the new values. Very powerful!
   *
   * The object inside queryKey acts like a "cache key".
   * Different search terms = different cache entries.
   */
  const { data, isLoading, isError } = useQuery({
    queryKey: ["jobs", { search, page }],
    queryFn: () => getAllJobs({ search, page, limit: 9, status: "open" }),
    /*
     * keepPreviousData: true → while fetching page 2,
     * keep showing page 1 data instead of a blank screen.
     * This makes pagination feel smooth.
     */
    placeholderData: (prev) => prev,
  });

  const jobs = data?.data?.jobs || [];
  const pagination = data?.data?.pagination;

  // ─── Search Handler ───────────────────────────────────────
  /*
   * When user types in search, reset to page 1.
   * Otherwise searching "react" on page 3 might show no results.
   */
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-6xl px-4 py-10 mx-auto">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Browse Jobs</h1>
          <p className="mt-2 text-slate-400">
            Find the perfect project that matches your skills
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search
            size={18}
            className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search jobs by title..."
            className="w-full py-3 pl-12 pr-4 text-white transition border outline-none rounded-xl border-slate-700 bg-slate-900 placeholder-slate-500 focus:border-violet-500"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-600 border-t-violet-500" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="py-20 text-center text-red-400">
            Failed to load jobs. Please try again.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && jobs.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <Briefcase size={48} className="mb-4 text-slate-700" />
            <p className="text-xl font-semibold text-slate-400">No jobs found</p>
            <p className="mt-2 text-slate-500">
              {search ? `No results for "${search}"` : "No open jobs right now"}
            </p>
          </div>
        )}

        {/* Jobs Grid */}
        {jobs.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              /*
               * key={job._id} is required when rendering a list.
               * React uses this to track which items changed,
               * added, or removed — for efficient re-renders.
               */
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm transition border rounded-lg border-slate-700 text-slate-300 hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-400">
              Page {page} of {pagination.pages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
              disabled={page === pagination.pages}
              className="px-4 py-2 text-sm transition border rounded-lg border-slate-700 text-slate-300 hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default JobFeedPage;




















// ┌──────────────────────────────────────────────────────────────────────────────┐
// │                                                                              │
// │  Browse Jobs                                                                 │
// │  Find the perfect project that matches your skills                           │
// │                                                                              │
// │  ┌────────────────────────────────────────────────────────────────────────┐  │
// │  │ 🔍 Search jobs by title...                                            │  │
// │  └────────────────────────────────────────────────────────────────────────┘  │
// │                                                                              │
// │                                                                              │
// │ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐   │
// │ │ React Developer      │ │ MERN Stack App      │ │ UI/UX Designer        │   │
// │ │                  OPEN│ │                 OPEN│ │                 OPEN  │   │
// │ │──────────────────────│ │─────────────────────│ │──────────────────────│   │
// │ │ Need experienced     │ │ Looking for full    │ │ Design modern        │   │
// │ │ React developer for  │ │ stack developer...  │ │ dashboard...         │   │
// │ │ SaaS dashboard...    │ │                     │ │                      │   │
// │ │                      │ │                     │ │                      │   │
// │ │ React   Node   CSS   │ │ MERN Mongo React   │ │ Figma UI UX          │   │
// │ │                      │ │                     │ │                      │   │
// │ │ 💲1200   🕒 Jun 20   │ │ 💲900   🕒 Jun 18   │ │ 💲600   🕒 Jun 15    │   │
// │ │                      │ │                     │ │                      │   │
// │ │ 👤 J John            │ │ 👤 A Alice         │ │ 👤 M Mike            │   │
// │ │                      │ │                     │ │                      │   │
// │ │ ┌──────────────────┐ │ │ ┌────────────────┐ │ │ ┌──────────────────┐ │   │
// │ │ │  View Details    │ │ │ │ View Details   │ │ │ │ View Details     │ │   │
// │ │ └──────────────────┘ │ │ └────────────────┘ │ │ └──────────────────┘ │   │
// │ └──────────────────────┘ └─────────────────────┘ └──────────────────────┘   │
// │                                                                              │
// │ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐   │
// │ │ Node.js API          │ │ Flutter Developer    │ │ Python Automation    │   │
// │ │                  OPEN│ │                 OPEN│ │                 OPEN  │   │
// │ │ ...                  │ │ ...                 │ │ ...                  │   │
// │ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘   │
// │                                                                              │
// │                      ◀ Previous      Page 1 of 5      Next ▶                 │
// │                                                                              │
// └──────────────────────────────────────────────────────────────────────────────┘