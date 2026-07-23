import { NextRequest, NextResponse } from "next/server";
import { OnboardingInputSchema, WorkoutPlanSchema } from "@/lib/schemas";
import { checkForRedFlags, SAFETY_DECLINE_MESSAGES } from "@/lib/safety";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateWorkoutPlan } from "@/lib/workout-generator";

// This route no longer calls any external API — the plan is generated
// entirely by lib/workout-generator.ts. No API key is required.
export const runtime = "nodejs";

function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  // 1. Rate limit first — cheapest check, protects everything downstream.
  const clientKey = getClientKey(request);
  const rateLimit = checkRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        status: "error",
        error: "rate_limited",
        message: "You're generating plans too quickly. Please wait a bit and try again.",
      },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  // 2. Parse and validate the request body.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsedInput = OnboardingInputSchema.safeParse(rawBody);
  if (!parsedInput.success) {
    return NextResponse.json(
      {
        status: "error",
        error: "validation_failed",
        message: "Some of the information you entered isn't valid.",
        issues: parsedInput.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const input = parsedInput.data;

  // 3. Safety pre-filter — declines entirely for injury/medical/pregnancy/
  // eating-disorder red flags rather than attempting to generate around
  // them. Milder injury/limitation mentions that don't trip this filter
  // still get a clear (non-medical) warning — see lib/workout-generator.ts.
  const safetyCheck = checkForRedFlags(input.injuriesOrLimitations, input.exercisePreferences);
  if (safetyCheck.flagged) {
    const details = safetyCheck.categories
      .map((category) => SAFETY_DECLINE_MESSAGES[category])
      .filter(Boolean);

    return NextResponse.json({
      status: "declined",
      categories: safetyCheck.categories,
      message:
        "This app can't safely generate a plan for what you described. " + details.join(" "),
    });
  }

  // 4. Generate the plan — pure, local, deterministic-ish rule engine.
  try {
    const plan = generateWorkoutPlan(input);

    const validated = WorkoutPlanSchema.safeParse(plan);
    if (!validated.success) {
      console.error("Generated workout plan failed schema validation", validated.error);
      return NextResponse.json(
        {
          status: "error",
          error: "invalid_generated_output",
          message: "Something went wrong building your plan. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "ok", plan: validated.data });
  } catch (error) {
    console.error("Unexpected error generating workout plan", error);
    return NextResponse.json(
      {
        status: "error",
        error: "unknown",
        message: "Something unexpected went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
