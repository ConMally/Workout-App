import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SubstitutionHistory } from "@/lib/storage";
import type { SubstitutionRepository } from "../substitution-repository";

export function createSupabaseSubstitutionRepository(client: SupabaseClient<Database>): SubstitutionRepository {
  return {
    async getSubstitutionHistory(userId: string): Promise<SubstitutionHistory> {
      const { data, error } = await client
        .from("plan_substitution_history")
        .select("history")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return (data?.history as SubstitutionHistory | undefined) ?? {};
    },

    async saveSubstitutionHistory(userId: string, history: SubstitutionHistory): Promise<void> {
      const { error } = await client.from("plan_substitution_history").upsert({ user_id: userId, history });
      if (error) throw error;
    },

    async clearSubstitutionHistory(userId: string): Promise<void> {
      const { error } = await client.from("plan_substitution_history").delete().eq("user_id", userId);
      if (error) throw error;
    },
  };
}
