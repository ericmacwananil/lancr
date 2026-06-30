import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import FreelancerProfilePage from "@/pages/FreelancerProfilePage";
import JobFeedPage from "@/pages/JobFeedPage";
import JobDetailPage from "@/pages/JobDetailPage";
import PostJobPage from "@/pages/PostJobPage";
import ClientDashboard from "@/pages/ClientDashboard";
import FreelancerDashboard from "@/pages/FreelancerDashboard";
import ContractDetailPage from "@/pages/ContractDetailPage";
import PaymentPage from "@/pages/PaymentPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ChatPage from "@/pages/ChatPage";

function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* ── Public Routes ─────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/jobs" element={<JobFeedPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/profile/:userId" element={<FreelancerProfilePage />} />

        {/* ── Shared Protected Routes ───────────────────── */}
        <Route path="/dashboard"
          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        />
        <Route path="/contracts/:contractId"
          element={<ProtectedRoute><ContractDetailPage /></ProtectedRoute>}
        />
        <Route path="/chat"
          element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
        />

        {/* ── Client Only ───────────────────────────────── */}
        <Route path="/post-job"
          element={<ProtectedRoute requiredRole="client"><PostJobPage /></ProtectedRoute>}
        />
        <Route path="/client-dashboard"
          element={<ProtectedRoute requiredRole="client"><ClientDashboard /></ProtectedRoute>}
        />
        <Route path="/payment/:contractId"
          element={<ProtectedRoute requiredRole="client"><PaymentPage /></ProtectedRoute>}
        />

        {/* ── Freelancer Only ───────────────────────────── */}
        <Route path="/freelancer-dashboard"
          element={<ProtectedRoute requiredRole="freelancer"><FreelancerDashboard /></ProtectedRoute>}
        />

        {/* ── Admin Only ────────────────────────────────── */}
        <Route path="/admin"
          element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
        />

        {/* ── Catch All ─────────────────────────────────── */}
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="text-center">
              <p className="text-6xl font-bold text-violet-500">404</p>
              <p className="mt-4 text-xl text-white">Page not found</p>
              <a href="/" className="inline-block mt-6 text-violet-400 hover:underline">
                ← Go Home
              </a>
            </div>
          </div>
        } />

      </Routes>
    </AuthProvider>
  );
}

export default App;