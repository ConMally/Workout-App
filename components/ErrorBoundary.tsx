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
          className="flex flex-col items-center gap-3 rounded-[var(--card-radius)] border border-danger/30 bg-danger-soft px-6 py-10 text-center sm:px-8"
        >
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 16.5h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <h2 className="text-lg font-semibold text-danger">Something went wrong</h2>
          <p className="max-w-md text-sm text-danger">
            This part of the app hit an unexpected error. Your data is safe — nothing here was saved or lost because
            of this.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-[var(--control-radius)] bg-danger px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition motion-safe:active:scale-95 hover:opacity-90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                this.handleRetry();
                this.props.onReturnHome();
              }}
              className="rounded-[var(--control-radius)] border border-danger/40 px-5 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-soft"
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
