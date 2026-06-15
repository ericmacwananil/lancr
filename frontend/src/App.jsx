import { Routes, Route} from "react-router-dom"

// Pages (We'll built these feature by feature)
// import HomePage from "@pages/HomePage";
// import LoginPage from "@pages/LoginPage";

function App() {
  return (
    <Routes>
      <Route
      path="/"
      element={
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">
                🚀 Freelance Marketplace
              </h1>
              <p className="mt-3 text-slate-400">
                Project setup complete. Ready to build.
              </p>
            </div>
        </div>
      }
      />
    </Routes>
  );
}

export default  App;