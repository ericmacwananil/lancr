import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// This file is used to protect pages that should only be accessible after a user logs in.


// Suppose:

// Home page → Everyone can visit.
// Login page → Everyone can visit.
// Register page → Everyone can visit.
// Dashboard → Only logged-in users.
// Post Job → Only clients.
// Profile → Only logged-in users.

// Then your routes become:

// Home
//    ↓
// Everyone

// Dashboard
//    ↓
// ProtectedRoute
//    ↓
// Logged in?
//    ↓
// Yes → Dashboard

// No → Login

/**
 * HOW PROTECTED ROUTES WORK:
 * 
 * We wrap any page that requires login with <ProtectedRoute>
 * It checks if the user is logged in before rendering the page.
 * 
 * If loading -> show spinner(app is checking login status)
 * If no user -> redirect to /login
 * If logged in -> render the actual page
 * 
 * Optional: pass requiredRole="client" o also check the role.
 * Example: <ProtectedRoute requiredRole="client"><PostJobPage/></ProtectedRoute>
 * 
 */

// 1. What is children?

// In React, children means whatever is written between the opening and closing tags of a component.

// For example:

// <ProtectedRoute>
//   <DashboardPage />
// </ProtectedRoute>

// Here,

// <DashboardPage />

// is the children.

const ProtectedRoute = ({ children, requiredRole }) => {
    const { currentUser, authLoading } = useAuth();

    //While checking login status, show a loading screen
    if(authLoading){
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                 {/* this inner div create spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-violet-500" />
      </div>
        );
    }
 
    // not logged in -> go to login page
    if(!currentUser) {
        return <Navigate to="/login" replace/>;
    }
     // Logged in but wrong role (e.g. freelancer trying to access client page)
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // All checks passed → render the page
  return children;

}
export default ProtectedRoute;