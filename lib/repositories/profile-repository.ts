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
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateInput {
  displayName?: string | null;
  preferredWeightUnit?: WeightUnit;
  experienceLevel?: ExperienceLevel | null;
  weeklyTrainingTarget?: number | null;
  onboardingCompleted?: boolean;
}

export interface ProfileRepository {
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(userId: string, input: ProfileUpdateInput): Promise<Profile>;
}
