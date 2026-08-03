import type { AnalyticsEventRepository } from "../analytics-event-repository";

// Local/guest mode has no analytics backend — matches every other local
// repository's convention of a minimal working stand-in even though this
// path is currently unreachable (see lib/repositories/useRepositories.ts:
// this app has no guest/local-only mode today).
export function createLocalAnalyticsEventRepository(): AnalyticsEventRepository {
  return {
    async track() {
      // no-op
    },
  };
}
