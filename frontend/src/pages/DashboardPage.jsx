// 🖥️ Dashboard UI (visual output)

// +------------------------------------------------------+
// |                                                      |
// |                                                      |
// |        +--------------------------------+            |
// |        |   🟦 Client / 🟢 Freelancer    |            |
// |        |--------------------------------|            |
// |        |                              |             |
// |        |   Welcome, John Doe!        |             |
// |        |   john@email.com             |             |
// |        |                              |             |
// |        |   [ 🚪 Logout Button ]       |             |
// |        |                              |             |
// |        +--------------------------------+            |
// |                                                      |
// |                                                      |
// +------------------------------------------------------+

import { useNavigate } from "react-router-dom";
import { User, Briefcase } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

/*
 * Temporary dashboard — just shows who is logged in.
 * We'll replace this with a real dashboard in later features.
 */
const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">

        {/* Role Badge */}
        <div className="mb-4 flex justify-center">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
            currentUser?.role === "client"
              ? "bg-blue-500/10 text-blue-400"
              : "bg-green-500/10 text-green-400"
          }`}>
            {currentUser?.role === "client" ? (
              <Briefcase size={14} />
            ) : (
              <User size={14} />
            )}
            {currentUser?.role}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white">
          Welcome, {currentUser?.name}!
        </h2>
        <p className="mt-2 text-slate-400">{currentUser?.email}</p>

        <button
          onClick={handleLogout}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2.5 text-slate-300 transition hover:border-red-500 hover:text-red-400"
        >
          Logout
        </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;