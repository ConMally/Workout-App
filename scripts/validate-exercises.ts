import { validateExerciseDatabase } from "@/lib/exercises/validate";

const issues = validateExerciseDatabase();

if (issues.length === 0) {
  console.log("Exercise library OK — no issues found.");
  process.exit(0);
}

console.error(`Found ${issues.length} issue(s) in the exercise library:\n`);
for (const issue of issues) {
  console.error(`  [${issue.exerciseId}] ${issue.message}`);
}
process.exit(1);
