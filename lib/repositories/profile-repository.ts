import type { z } from "zod";
import type { ExperienceLevelEnum } from "@/lib/schemas";
import type { WeightUnit } from "@/types/workout-log";

// Repository interfaces describe the storage contract the app's business
// logic depends on, independent of *where* data actually lives.
// ProfileRepository is the first one with a real implementation
// (lib/repositories/supabase/profile-repository.ts) — every other
// repository in this folder is still interface-only, since workout data
// stays on localStorage this phase. Reuses the app's existing
// ExperienceLevel and WeightUnit types rather than redefining them.

export type ExperienceLevel = z.infer<typeof ExperienceLevelEnum>;

export interface Profile {
  id: string;
  displayName: string | null;
  preferredWeightUnit: WeightUnit;
  experienceLevel: ExperienceLevel | null;
  weeklyTrainingTarget: number | null;
  onboardingCompleted: boolean;
  // Phase 9: hidden admin-dashboard gate (checked server-side in
  // app/admin/page.tsx) and the "never ask again" flag for the beta rating
  // prompt (components/feedback/RatingPrompt.tsx).
  isAdmin: boolean;
  feedbackPromptDismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateInput {
  displayName?: string | null;
  preferredWeightUnit?: WeightUnit;
  experienceLevel?: ExperienceLevel | null;
  weeklyTrainingTarget?: number | null;
  onboardingCompleted?: boolean;
  feedbackPromptDismissedAt?: string | null;
}

export interface ProfileRepository {
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(userId: string, input: ProfileUpdateInput): Promise<Profile>;
}
