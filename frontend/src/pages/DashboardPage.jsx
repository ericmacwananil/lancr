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

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      switch (currentUser.role) {
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
          navigate("/");
      }
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <p className="text-slate-400">Redirecting...</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;