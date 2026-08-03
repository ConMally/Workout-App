import type { CrashReportRepository } from "../crash-report-repository";

export function createLocalCrashReportRepository(): CrashReportRepository {
  return {
    async reportCrash() {
      // no-op
    },
  };
}
