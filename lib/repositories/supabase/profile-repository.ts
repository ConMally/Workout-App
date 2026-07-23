import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Profile, ProfileRepository, ProfileUpdateInput } from "../profile-repository";

// The first concrete repository implementation. Every method takes the
// user id as an explicit argument for interface symmetry, but never trusts
// it as an authorization boundary by itself — callers (server actions)
// must have already derived that id from supabase.auth.getUser() on the
// same request, and RLS on the `profiles` table independently enforces
// `auth.uid() = id` regardless of what's passed here.

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    preferredWeightUnit: row.preferred_weight_unit,
    experienceLevel: row.experience_level,
    weeklyTrainingTarget: row.weekly_training_target,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseProfileRepository(client: SupabaseClient<Database>): ProfileRepository {
  return {
    async getProfile(userId: string): Promise<Profile | null> {
      const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data ? toProfile(data) : null;
    },

    async upsertProfile(userId: string, input: ProfileUpdateInput): Promise<Profile> {
      const { data, error } = await client
        .from("profiles")
        .upsert({
          id: userId,
          ...(input.displayName !== undefined && { display_name: input.displayName }),
          ...(input.preferredWeightUnit !== undefined && { preferred_weight_unit: input.preferredWeightUnit }),
          ...(input.experienceLevel !== undefined && { experience_level: input.experienceLevel }),
          ...(input.weeklyTrainingTarget !== undefined && { weekly_training_target: input.weeklyTrainingTarget }),
          ...(input.onboardingCompleted !== undefined && { onboarding_completed: input.onboardingCompleted }),
        })
        .select("*")
        .single();

      if (error) throw error;
      return toProfile(data);
    },
  };
}
