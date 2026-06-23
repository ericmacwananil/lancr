import { Link } from "react-router-dom";
import {
  ArrowRight, Shield, Zap, Star,
  Briefcase, Users, DollarSign,
  CheckCircle, FileText, Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/*
 * WHAT IS THIS PAGE?
 * The public home page at "/" that visitors see first.
 * Sections:
 * 1. Hero — headline + CTA buttons
 * 2. Stats — quick platform numbers
 * 3. How It Works — 3-step process
 * 4. Features — why choose this platform
 * 5. CTA Banner — final push to register
 */

// ─── How It Works Step ────────────────────────────────────────
const HowItWorksStep = ({ step, icon, title, description }) => (
  <div className="relative flex flex-col items-center text-center">
    {/* Step number circle */}
    <div className="relative mb-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600">
        {icon}
      </div>
      {/* Step number badge */}
      <span className="absolute flex items-center justify-center w-6 h-6 text-xs font-bold border rounded-full -right-2 -top-2 bg-slate-800 text-violet-400 border-violet-500/30">
        {step}
      </span>
    </div>
    <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
    <p className="text-sm leading-relaxed text-slate-400">{description}</p>
  </div>
);

// ─── Feature Card ─────────────────────────────────────────────
const FeatureCard = ({ icon, title, description }) => (
  <div className="p-6 transition border rounded-2xl border-slate-800 bg-slate-900 hover:border-violet-500/30">
    <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-violet-500/10">
      {icon}
    </div>
    <h3 className="mb-2 font-semibold text-white">{title}</h3>
    <p className="text-sm leading-relaxed text-slate-400">{description}</p>
  </div>
);

// ─── Main Landing Page ────────────────────────────────────────
const LandingPage = () => {
  /*
   * If user is already logged in, show different CTA buttons.
   * Logged-in users go to dashboard, not register.
   */
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-6xl px-4 py-4 mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">FreelanceHub</span>
          </div>

          {/* Nav Links */}
          <div className="items-center hidden gap-6 sm:flex">
            <a href="#how-it-works" className="text-sm transition text-slate-400 hover:text-white">
              How It Works
            </a>
            <a href="#features" className="text-sm transition text-slate-400 hover:text-white">
              Features
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-semibold text-white transition rounded-lg bg-violet-600 hover:bg-violet-700"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm transition text-slate-400 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white transition rounded-lg bg-violet-600 hover:bg-violet-700"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────── */}
      <section className="px-4 pt-20 pb-24">
        <div className="max-w-4xl mx-auto text-center">

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5">
            <Shield size={14} className="text-violet-400" />
            <span className="text-sm text-violet-300">
              Secured by Escrow — Get paid, guaranteed
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-bold leading-tight text-white sm:text-6xl">
            The Freelance Platform
            <span className="block text-violet-400">
              Built on Trust
            </span>
          </h1>

          <p className="max-w-2xl mx-auto mb-10 text-lg text-slate-400">
            Connect with top freelancers. Pay securely through escrow.
            Funds are only released when you approve the work.
            No risk, no disputes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {currentUser ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 font-semibold text-white transition hover:bg-violet-700"
              >
                Go to Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 font-semibold text-white transition hover:bg-violet-700"
                >
                  Start Hiring
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/jobs"
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  Browse Jobs
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats Section ───────────────────────────────────── */}
      <section className="px-4 py-12 border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { label: "Freelancers", value: "10K+",   icon: <Users size={20} className="text-violet-400" /> },
              { label: "Jobs Posted", value: "25K+",   icon: <Briefcase size={20} className="text-blue-400" /> },
              { label: "Paid Out",    value: "$2M+",   icon: <DollarSign size={20} className="text-green-400" /> },
              { label: "Avg Rating",  value: "4.9 ⭐", icon: <Star size={20} className="text-yellow-400" /> },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section id="how-it-works" className="px-4 py-24">
        <div className="max-w-5xl mx-auto">

          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-slate-400">
              Three simple steps to get your project done safely
            </p>
          </div>

          <div className="grid gap-12 sm:grid-cols-3">
            <HowItWorksStep
              step="1"
              icon={<Briefcase size={24} className="text-white" />}
              title="Post a Job"
              description="Describe your project, set your budget, and list the skills you need. Freelancers will send you proposals."
            />
            {/*
             * Connector line between steps (hidden on mobile).
             * Absolutely positioned between the grid columns.
             */}
            <HowItWorksStep
              step="2"
              icon={<Lock size={24} className="text-white" />}
              title="Fund Escrow"
              description="Accept a bid and pay securely into escrow. Your money is held safely until you approve the delivered work."
            />
            <HowItWorksStep
              step="3"
              icon={<CheckCircle size={24} className="text-white" />}
              title="Release Funds"
              description="Review the work. Happy with it? Release the funds. Need changes? Request a revision. You're always in control."
            />
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────── */}
      <section id="features" className="px-4 py-24 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">

          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Why FreelanceHub?
            </h2>
            <p className="mt-4 text-slate-400">
              Built with real security and trust in mind
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Shield size={22} className="text-violet-400" />}
              title="Escrow Protection"
              description="Funds are held securely in escrow and only released when you approve the work. Zero risk for clients."
            />
            <FeatureCard
              icon={<Zap size={22} className="text-yellow-400" />}
              title="Fast Payments"
              description="Powered by Stripe. Instant payouts to freelancers once work is approved. No waiting weeks for checks."
            />
            <FeatureCard
              icon={<Star size={22} className="text-blue-400" />}
              title="Verified Reviews"
              description="Reviews are only allowed after contract completion. Every rating is from a real project, not fake feedback."
            />
            <FeatureCard
              icon={<Users size={22} className="text-green-400" />}
              title="Top Freelancers"
              description="Browse skilled freelancers with real ratings. Filter by skills and budget to find the perfect match."
            />
            <FeatureCard
              icon={<FileText size={22} className="text-orange-400" />}
              title="Smart Contracts"
              description="Every project gets a contract with clear terms. Both sides know exactly what's expected and when."
            />
            <FeatureCard
              icon={<DollarSign size={22} className="text-pink-400" />}
              title="No Hidden Fees"
              description="Transparent pricing with no surprise charges. What you see is what you pay."
            />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────── */}
      <section className="px-4 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="p-12 text-center border rounded-3xl border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-slate-900">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-slate-400">
              Join thousands of clients and freelancers already
              working together safely on FreelanceHub.
            </p>
            <div className="flex flex-col items-center gap-4 mt-8 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
              >
                Create Free Account
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/jobs"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 font-semibold text-slate-300 transition hover:border-slate-600 sm:w-auto"
              >
                Browse Jobs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="px-4 py-8 border-t border-slate-800">
        <div className="flex flex-col items-center justify-between max-w-6xl gap-4 mx-auto sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg h-7 w-7 bg-violet-600">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-semibold text-white">FreelanceHub</span>
          </div>
          <p className="text-sm text-slate-500">
            © 2025 FreelanceHub. Built with MERN + Stripe + Escrow.
          </p>
          <div className="flex gap-4">
            <Link to="/login" className="text-sm text-slate-500 hover:text-white">
              Login
            </Link>
            <Link to="/register" className="text-sm text-slate-500 hover:text-white">
              Register
            </Link>
            <Link to="/jobs" className="text-sm text-slate-500 hover:text-white">
              Browse Jobs
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;