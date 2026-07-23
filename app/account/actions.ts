"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseProfileRepository } from "@/lib/repositories/supabase/profile-repository";
import { ProfileUpdateSchema } from "@/lib/validation/profile";
import type { ActionResult } from "@/lib/auth/action-state";

export async function updateProfile(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Your session has expired. Please log in again." };
  }

  const experienceLevelRaw = formData.get("experienceLevel");
  const weeklyTrainingTargetRaw = formData.get("weeklyTrainingTarget");
  const displayNameRaw = formData.get("displayName");

  // preferredWeightUnit is deliberately not read here — user_settings.weight_unit
  // (edited from Settings) is the single source of truth for weight units as of
  // Phase 3C; this form no longer offers a second, unsynced copy of that choice.
  const parsed = ProfileUpdateSchema.safeParse({
    displayName: typeof displayNameRaw === "string" && displayNameRaw.trim() === "" ? null : displayNameRaw,
    experienceLevel: experienceLevelRaw === "" ? null : experienceLevelRaw,
    weeklyTrainingTarget: weeklyTrainingTargetRaw === "" ? null : weeklyTrainingTargetRaw,
    onboardingCompleted: formData.get("onboardingCompleted") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const repository = createSupabaseProfileRepository(supabase);
  try {
    await repository.upsertProfile(user.id, parsed.data);
  } catch {
    return { status: "error", message: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/account");
  return { status: "success", message: "Profile updated." };
}
