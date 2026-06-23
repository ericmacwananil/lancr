import { Component } from "react";

/*
 * WHAT IS AN ERROR BOUNDARY?
 * React components can crash due to unexpected JS errors.
 * Without an Error Boundary, one crash breaks the ENTIRE app.
 *
 * Error Boundary = a safety net that catches crashes in any
 * child component and shows a fallback UI instead of a blank page.
 *
 * WHY A CLASS COMPONENT?
 * Error Boundaries MUST be class components.
 * React hasn't added this feature to hooks yet.
 * componentDidCatch() and getDerivedStateFromError() are the
 * two lifecycle methods that make this work.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    /*
     * hasError: controls whether to show the error UI.
     * error: stores the actual error object for display.
     */
    this.state = { hasError: false, error: null };
  }

  /*
   * getDerivedStateFromError() is called when a child throws.
   * It updates state to trigger the fallback UI render.
   * This is a static method — it runs before render().
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /*
   * componentDidCatch() is called after the error is caught.
   * Good place to log errors to a service like Sentry.
   * errorInfo.componentStack shows which component crashed.
   */
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen px-4 bg-slate-950">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
                <span className="text-3xl">💥</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="mt-3 text-slate-400">
              An unexpected error occurred. Please refresh the page.
            </p>
            {/* Show error details in development only */}
            {import.meta.env.DEV && this.state.error && (
              <div className="p-4 mt-4 text-left border rounded-xl border-red-500/20 bg-red-500/5">
                <p className="font-mono text-xs text-red-400">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-violet-600 px-6 py-2.5 font-semibold text-white transition hover:bg-violet-700"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="ml-3 mt-6 rounded-lg border border-slate-700 px-6 py-2.5 font-semibold text-slate-300 transition hover:border-slate-600"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    /*
     * If no error, render children normally.
     * this.props.children = whatever is wrapped inside <ErrorBoundary>
     */
    return this.props.children;
  }
}

export default ErrorBoundary;