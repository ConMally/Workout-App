"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReportCrash: (error: Error, componentStack: string) => void;
  onReturnHome: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Phase 9 PART 6. A class component because React error boundaries have no
// hook equivalent — componentDidCatch is the only way to intercept a
// render-time throw from anywhere below it in the tree. Reporting (via
// onReportCrash, supplied by the functional wrapper below so this class
// never needs hooks of its own) never blocks or gates the recovery UI —
// see AppErrorBoundary#handleReportCrash's fire-and-forget write.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onReportCrash(error, errorInfo.componentStack ?? "");
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center sm:px-8 dark:border-red-900 dark:bg-red-950/30"
        >
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 16.5h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">Something went wrong</h2>
          <p className="max-w-md text-sm text-red-700 dark:text-red-300">
            This part of the app hit an unexpected error. Your data is safe — nothing here was saved or lost because
            of this.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95 hover:bg-red-700"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                this.handleRetry();
                this.props.onReturnHome();
              }}
              className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              Return home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
