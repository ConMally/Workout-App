import { readSubstitutionHistory, writeSubstitutionHistory, clearSubstitutionHistory } from "@/lib/storage";
import type { SubstitutionRepository } from "../substitution-repository";

export function createLocalSubstitutionRepository(): SubstitutionRepository {
  return {
    async getSubstitutionHistory() {
      return readSubstitutionHistory();
    },
    async saveSubstitutionHistory(_userId, history) {
      writeSubstitutionHistory(history);
    },
    async clearSubstitutionHistory() {
      clearSubstitutionHistory();
    },
  };
}
