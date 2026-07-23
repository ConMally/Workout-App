import { z } from "zod";
import { ExperienceLevelEnum } from "@/lib/schemas";
import { WeightUnitEnum } from "@/types/workout-log";

// Reuses the app's existing ExperienceLevelEnum (lib/schemas.ts) and
// WeightUnitEnum (types/workout-log.ts) rather than redefining them, so
// profile fields can never silently drift out of sync with onboarding/
// settings' own enums.

export const ProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(60, "Display name must be 60 characters or fewer")
    .nullable()
    .optional(),
  preferredWeightUnit: WeightUnitEnum.optional(),
  experienceLevel: ExperienceLevelEnum.nullable().optional(),
  weeklyTrainingTarget: z.coerce.number().int().min(1).max(7).nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
});
export type ProfileUpdateFormInput = z.infer<typeof ProfileUpdateSchema>;
