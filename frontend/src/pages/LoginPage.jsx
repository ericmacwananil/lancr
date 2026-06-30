import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { loginUser } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const { mutate: login, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: async (data) => {
  toast.success(`Welcome back, ${data.data.user.name}!`);

  await refetchUser();

  const role = data.data.user.role;

  switch (role) {
    case "admin":
      navigate("/admin");
      break;

    case "client":
      navigate("/client-dashboard");
      break;

    case "freelancer":
      navigate("/freelancer-dashboard");
      break;

    default:
      navigate("/dashboard");
  }
},
    onError: (error) => {
      toast.error(error.message || "Login failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-slate-950">
      <div className="w-full max-w-md">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-sm transition text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="mt-2 text-slate-400">Sign in to your account</p>
        </div>

        <div className="p-8 border rounded-2xl border-slate-800 bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-4">

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
                placeholder="Your password"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <p className="mt-6 text-sm text-center text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-violet-400 hover:underline">
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;


// ████████████████████████████████████████████████

//                   Welcome Back
//             Sign in to your account

//           ┌──────────────────────┐
//           │                      │
//           │ Email Address        │
//           │ ┌──────────────────┐ │
//           │ │ john@example.com │ │
//           │ └──────────────────┘ │
//           │                      │
//           │ Password             │
//           │ ┌──────────────────┐ │
//           │ │ •••••••••••      │ │
//           │ └──────────────────┘ │
//           │                      │
//           │ █████ Sign In █████  │
//           │                      │
//           │ Don't have an        │
//           │ account? Sign up     │
//           └──────────────────────┘

// ███████████████████████████████████████████████