"use client";

import type { ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { useRepositories } from "@/lib/repositories/useRepositories";

interface AppErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  onReturnHome: () => void;
}

// Thin functional wrapper so ErrorBoundary (a class component, required by
// React for componentDidCatch) can still reach the repository bundle and
// current userId through the normal hook — same pattern as
// lib/analytics-events/useTrackEvent.ts. Crash reporting failures are
// swallowed: never let a failed crash report throw a second error on top
// of the one already being recovered from.
export default function AppErrorBoundary({ children, componentName, onReturnHome }: AppErrorBoundaryProps) {
  const reposState = useRepositories();

  function handleReportCrash(error: Error, componentStack: string) {
    if (reposState.status !== "ready") return;
    reposState.repositories.crashReports
      .reportCrash(reposState.userId, {
        message: error.message,
        stack: error.stack ?? componentStack,
        componentName,
      })
      .catch(() => {});
  }

  return (
    <ErrorBoundary onReportCrash={handleReportCrash} onReturnHome={onReturnHome}>
      {children}
    </ErrorBoundary>
  );
}
