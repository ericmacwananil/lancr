import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, User, ArrowLeft } from "lucide-react";

import { registerUser } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";

/*
 * useMutation from React Query is used for POST/PUT/DELETE requests
 * (anything that changes data on the server).
 *
 * It gives us:
 * - mutate(data): call this to trigger the API request
 * - isPending: true while the request is in flight
 * - isError / error: if something went wrong
 */

const RegisterPage = () => {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  // Local form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "client", // default role
  });

  // Handle input changes — one handler for all fields
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle role selection (Client / Freelancer toggle)
  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  /*
   * useMutation wires up our registerUser API call.
   * onSuccess: runs when the API call succeeds
   * onError: runs when the API call fails
   */
  const { mutate: register, isPending } = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      toast.success(data.message || "Account created!");
      /*
       * After registering, refetch the current user so AuthContext
       * immediately reflects the new logged-in state.
       * Then redirect to dashboard.
       */
      refetchUser();
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault(); // prevent page reload
    register(formData); // trigger the mutation
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="mt-2 text-slate-400">Join the freelance marketplace</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">

          {/* Role Toggle */}
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-slate-400">
              I want to...
            </p>
            <div className="grid grid-cols-2 gap-3">

              {/* Client Button */}
              <button
                type="button"
                onClick={() => handleRoleSelect("client")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  formData.role === "client"
                    ? "border-violet-500 bg-violet-500/10 text-violet-400"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                <Briefcase size={24} />
                <span className="text-sm font-medium">Hire Talent</span>
                <span className="text-xs opacity-70">Post jobs, hire freelancers</span>
              </button>

              {/* Freelancer Button */}
              <button
                type="button"
                onClick={() => handleRoleSelect("freelancer")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  formData.role === "freelancer"
                    ? "border-violet-500 bg-violet-500/10 text-violet-400"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                <User size={24} />
                <span className="text-sm font-medium">Find Work</span>
                <span className="text-xs opacity-70">Bid on jobs, earn money</span>
              </button>

            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Creating account..." : "Create Account"}
            </button>

          </form>

          {/* Link to Login */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-violet-400 hover:underline">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;