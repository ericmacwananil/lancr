import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Zap, Home, Briefcase, User, LogOut, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getConversations } from "@/api/messageApi";

const Navbar = () => {
  const { currentUser, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  // Fetch conversations to get total unread count
  const { data: conversationsData } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    enabled: !!currentUser,
  });

  const conversations = conversationsData?.conversations || [];
  const totalUnread = conversations.reduce((sum, conv) => {
    const count = conv.unreadCounts?.[currentUser?._id?.toString()] || 0;
    return sum + count;
  }, 0);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="flex items-center justify-between max-w-6xl px-4 py-4 mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white">FreelanceHub</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/jobs"
            className="text-sm transition text-slate-400 hover:text-white"
          >
            <div className="flex items-center gap-2">
              <Briefcase size={16} />
              <span className="hidden sm:inline">Browse Jobs</span>
            </div>
          </Link>

          {currentUser && (
            <>
              <Link
                to="/chat"
                className="text-sm transition text-slate-400 hover:text-white relative"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  <span className="hidden sm:inline">Messages</span>
                  {totalUnread > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {totalUnread}
                    </span>
                  )}
                </div>
              </Link>
              {currentUser.role === "client" && (
                <Link
                  to="/client-dashboard"
                  className="text-sm transition text-slate-400 hover:text-white"
                >
                  My Jobs
                </Link>
              )}
              {currentUser.role === "freelancer" && (
                <Link
                  to="/freelancer-dashboard"
                  className="text-sm transition text-slate-400 hover:text-white"
                >
                  My Work
                </Link>
              )}
              {currentUser.role === "admin" && (
                <Link
                  to="/admin"
                  className="text-sm transition text-slate-400 hover:text-white"
                >
                  Admin Dashboard
                </Link>
              )}
              <Link
                to={`/profile/${currentUser._id}`}
                className="flex items-center gap-2 text-sm transition text-slate-400 hover:text-white"
              >
                <User size={16} />
                <span className="hidden sm:inline">{currentUser.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white disabled:opacity-50"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </span>
              </button>
            </>
          )}
          {!currentUser && (
            <>
              <Link
                to="/login"
                className="text-sm transition text-slate-400 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white transition rounded-lg bg-violet-600 hover:bg-violet-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
