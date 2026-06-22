import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import FreelancerProfilePage from "@/pages/FreelancerProfilePage";
import JobFeedPage from "@/pages/JobFeedPage";
import JobDetailPage from "@/pages/JobDetailPage";
import PostJobPage from "@/pages/PostJobPage";
import ClientDashboard from "@/pages/ClientDashboard";
import ContractDetailPage from "@/pages/ContractDetailPage"; // ← ADD
import PaymentPage from "@/pages/PaymentPage";
import FreelancerDashboard from "@/pages/FreelancerDashboard";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile/:userId" element={<FreelancerProfilePage />} />
        <Route path="/jobs" element={<JobFeedPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/post-job" element={<ProtectedRoute requiredRole="client"><PostJobPage /></ProtectedRoute>} />
        <Route path="/client-dashboard" element={<ProtectedRoute requiredRole="client"><ClientDashboard /></ProtectedRoute>} />

        {/* Contract page — both client and freelancer can access */}
        <Route
          path="/contracts/:contractId"
          element={
            <ProtectedRoute>
              <ContractDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
  path="/payment/:contractId"
  element={
    <ProtectedRoute requiredRole="client">
      <PaymentPage />
    </ProtectedRoute>
  }
/>
      <Route
  path="/freelancer-dashboard"
  element={
    <ProtectedRoute requiredRole="freelancer">
      <FreelancerDashboard />
    </ProtectedRoute>
  }
/>

      </Routes>
    </AuthProvider>
  );
}

export default App;