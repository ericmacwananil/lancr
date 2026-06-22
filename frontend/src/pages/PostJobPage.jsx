import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, ArrowLeft } from "lucide-react";

import { createJob } from "@/api/jobApi";

/*
 * WHAT IS THIS PAGE?
 * The form where clients post new jobs.
 * Only accessible to users with role = "client".
 * (Enforced by ProtectedRoute in App.jsx)
 */

const PostJobPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState([]);

  // Handle text input changes
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Add skill to array
  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 10) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  // Remove skill
  const handleRemoveSkill = (skill) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  /*
   * useMutation for creating the job.
   * On success: clear jobs cache → navigate to client dashboard
   * This forces a re-fetch of the job list so new job appears.
   */
  const { mutate: postJob, isPending } = useMutation({
    mutationFn: createJob,
    onSuccess: (data) => {
      toast.success("Job posted successfully!");
      /*
       * Invalidate the jobs cache so:
       * 1. Job feed shows the new job
       * 2. Client dashboard shows the new job
       */
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["myJobs"] });
      // Navigate to the newly created job's detail page
      navigate(`/jobs/${data.data.job._id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to post job");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    postJob({
      title: formData.title,
      description: formData.description,
      budget: Number(formData.budget), // Convert string to number for Zod
      skillsRequired: skills,
    });
  };

  return (
    <div className="min-h-screen px-4 py-10 bg-slate-950">
      <div className="max-w-2xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Post a New Job</h1>
          <p className="mt-2 text-slate-400">
            Describe what you need and let freelancers come to you
          </p>
        </div>

        {/* Form Card */}
        <div className="p-8 border rounded-2xl border-slate-800 bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Job Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Build a React dashboard with charts"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the project in detail. Include requirements, deliverables, and any specific tech stack you need..."
                required
                rows={6}
                maxLength={2000}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
              <p className="mt-1 text-xs text-right text-slate-500">
                {formData.description.length}/2000
              </p>
            </div>

            {/* Budget */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Budget (USD) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="500"
                  required
                  min="1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Skills Required */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Skills Required
                <span className="ml-2 text-xs text-slate-500">(optional, max 10)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="e.g. React"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              {/* Skills Tags */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 font-semibold text-white transition rounded-lg bg-violet-600 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Posting Job..." : "Post Job"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default PostJobPage;









// ┌────────────────────────────────────────────────────────────────────────────┐
// │ ← Back                                                                     │
// │                                                                            │
// │ Post a New Job                                                             │
// │ Describe what you need and let freelancers come to you                     │
// │                                                                            │
// ├────────────────────────────────────────────────────────────────────────────┤
// │                                                                            │
// │ ┌────────────────────────────────────────────────────────────────────────┐ │
// │ │                                                                      │ │
// │ │ Job Title *                                                          │ │
// │ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
// │ │ │ Build a React dashboard with charts                              │ │ │
// │ │ └──────────────────────────────────────────────────────────────────┘ │ │
// │ │                                                                      │ │
// │ │ Description *                                                        │ │
// │ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
// │ │ │ I need a freelancer to build an admin dashboard using React,     │ │ │
// │ │ │ Tailwind CSS and Recharts.                                       │ │ │
// │ │ │                                                                  │ │ │
// │ │ │ Features:                                                        │ │ │
// │ │ │ • Authentication                                                 │ │ │
// │ │ │ • Analytics Charts                                               │ │ │
// │ │ │ • Responsive Design                                              │ │ │
// │ │ │                                                                  │ │ │
// │ │ │ Estimated completion: 2 weeks                                    │ │ │
// │ │ └──────────────────────────────────────────────────────────────────┘ │ │
// │ │                                                     245 / 2000        │ │
// │ │                                                                      │ │
// │ │ Budget (USD) *                                                      │ │
// │ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
// │ │ │ $ 500                                                           │ │ │
// │ │ └──────────────────────────────────────────────────────────────────┘ │ │
// │ │                                                                      │ │
// │ │ Skills Required (optional, max 10)                                  │ │
// │ │                                                                      │ │
// │ │ ┌──────────────────────────────┐  ┌──────────────┐                  │ │
// │ │ │ React                        │  │ ＋ Add       │                  │ │
// │ │ └──────────────────────────────┘  └──────────────┘                  │ │
// │ │                                                                      │ │
// │ │  React ✕     Tailwind ✕     Node.js ✕     MongoDB ✕                 │ │
// │ │  Express ✕   JWT ✕          Recharts ✕                              │ │
// │ │                                                                      │ │
// │ │                                                                      │ │
// │ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
// │ │ │                      Post Job                                    │ │ │
// │ │ └──────────────────────────────────────────────────────────────────┘ │ │
// │ │                                                                      │ │
// │ └────────────────────────────────────────────────────────────────────────┘ │
// │                                                                            │
// └────────────────────────────────────────────────────────────────────────────┘