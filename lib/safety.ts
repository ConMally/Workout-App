// A fast, deterministic pre-filter that runs BEFORE any request reaches
// Claude. If it flags something, we never call the model at all — the
// refusal is guaranteed rather than dependent on the model's judgment.
// It's intentionally conservative: false positives (declining something
// that would have been fine) are an acceptable tradeoff for this app.

const RED_FLAG_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  {
    category: "pregnancy",
    patterns: [/\bpregnan(t|cy)\b/i, /\btrimester\b/i, /\bpostpartum\b/i],
  },
  {
    category: "eating_disorder",
    patterns: [
      /\banorexi/i,
      /\bbulimi/i,
      /\bbinge[\s-]?eat/i,
      /\beating\s*disorder\b/i,
      /\bpurg(e|ing)\b/i,
      /\bstarv(e|ing)\s*(myself|yourself)?\b/i,
    ],
  },
  {
    category: "severe_pain_or_acute_injury",
    patterns: [
      /\bsevere\s*pain\b/i,
      /\bchest\s*pain\b/i,
      /\bfractur/i,
      /\btorn\s*(acl|mcl|meniscus|rotator\s*cuff|ligament|muscle|tendon)\b/i,
      /\bherniated\s*disc\b/i,
      /\bsurger(y|ies)\b/i,
      /\bdislocat/i,
      /\bcan'?t\s*(walk|move|breathe)\b/i,
    ],
  },
  {
    category: "medical_condition",
    patterns: [
      /\bheart\s*(condition|disease|attack|arrhythmia)\b/i,
      /\bhigh\s*blood\s*pressure\b/i,
      /\bdiabet/i,
      /\basthma\b/i,
      /\bepileps(y|tic)\b/i,
      /\bseizure/i,
      /\bpacemaker\b/i,
      /\bblood\s*clot/i,
      /\bstroke\b/i,
    ],
  },
];

export interface SafetyCheckResult {
  flagged: boolean;
  categories: string[];
}

export function checkForRedFlags(...texts: string[]): SafetyCheckResult {
  const combined = texts.filter(Boolean).join(" \n ");
  const categories = new Set<string>();

  for (const { category, patterns } of RED_FLAG_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(combined))) {
      categories.add(category);
    }
  }

  return { flagged: categories.size > 0, categories: Array.from(categories) };
}

export const SAFETY_DECLINE_MESSAGES: Record<string, string> = {
  pregnancy:
    "Exercise needs during pregnancy and postpartum recovery vary a lot and should be guided by your OB-GYN or a certified pre/postnatal fitness specialist.",
  eating_disorder:
    "Exercise programming isn't appropriate here without support from a doctor or therapist who specializes in eating disorders — your safety matters more than a workout plan.",
  severe_pain_or_acute_injury:
    "This sounds like it needs a medical evaluation first. Please see a doctor or physical therapist before starting a new exercise program.",
  medical_condition:
    "With a medical condition like this, please get clearance from your doctor before starting a new exercise program — they can tell you what's safe for your specific situation.",
  model_declined:
    "Please consult a certified trainer or doctor for guidance tailored to your situation.",
};
