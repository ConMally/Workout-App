import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseProfileRepository } from "@/lib/repositories/supabase/profile-repository";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";

export const metadata: Metadata = { title: "Admin — LiftWise" };

// Phase 9 PART 4 — deliberately isolated: this route is never linked from
// app navigation, has its own layout (no AppHeader/AppNavigation), reads
// data with its own direct Supabase queries rather than the per-user
// Repositories bundle (admin queries are cross-user aggregates, a
// fundamentally different shape than "this user's own data"), and every
// gate below happens server-side before a single byte of admin data is
// fetched. See migration 0011's admin-bypass RLS policies for how the
// cross-user reads themselves are authorized.

interface CountEntry {
  label: string;
  count: number;
}

function getSevenDaysAgoIso(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function topCounts(items: (string | null | undefined)[], limit = 10): CountEntry[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export default async function AdminPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-12">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const profile = await createSupabaseProfileRepository(supabase).getProfile(user.id);
  if (!profile?.isAdmin) {
    // Deliberately a silent redirect, not an "access denied" page — a
    // hidden page shouldn't confirm its own existence to a non-admin.
    redirect("/");
  }

  const sevenDaysAgo = getSevenDaysAgoIso();

  const [
    totalUsersResult,
    recentActiveWorkoutsResult,
    workoutsCreatedResult,
    workoutsCompletedResult,
    feedbackResult,
    exerciseRowsResult,
    equipmentRowsResult,
    goalRowsResult,
    templateUsedRowsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("completed_workouts").select("user_id").gte("completed_at", sevenDaysAgo),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "workout_started"),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "workout_completed"),
    supabase.from("feedback").select("type, rating, message, page, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("completed_workout_exercises").select("name").limit(5000),
    supabase.from("workout_plans").select("equipment").limit(2000),
    supabase.from("workout_plans").select("goal").limit(2000),
    supabase.from("analytics_events").select("properties").eq("event_name", "template_used").limit(2000),
  ]);

  const totalUsers = totalUsersResult.count ?? 0;
  const activeUsers = new Set((recentActiveWorkoutsResult.data ?? []).map((r) => r.user_id)).size;
  const workoutsCreated = workoutsCreatedResult.count ?? 0;
  const workoutsCompleted = workoutsCompletedResult.count ?? 0;

  const feedbackRows = feedbackResult.data ?? [];
  const ratings = feedbackRows.filter((f) => f.type === "rating" && f.rating !== null).map((f) => f.rating as number);
  const averageRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
  const feedbackByType = topCounts(feedbackRows.map((f) => f.type));
  const recentFeedback = feedbackRows.slice(0, 15);

  const mostUsedExercises = topCounts((exerciseRowsResult.data ?? []).map((r) => r.name));
  const mostUsedEquipment = topCounts((equipmentRowsResult.data ?? []).flatMap((r) => r.equipment ?? []));
  const mostCommonGoals = topCounts((goalRowsResult.data ?? []).map((r) => r.goal));
  const mostUsedTemplates = topCounts(
    (templateUsedRowsResult.data ?? []).map((r) => {
      const properties = r.properties as Record<string, unknown> | null;
      return typeof properties?.templateName === "string" ? properties.templateName : null;
    })
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div>
        <Link href="/" className="text-sm font-medium text-teal-700 hover:underline">
          ← Back to app
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Beta admin dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Aggregate usage across all beta users. Not linked from the app.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total users" value={totalUsers} />
        <StatCard label="Active users (7d)" value={activeUsers} />
        <StatCard label="Workouts started" value={workoutsCreated} />
        <StatCard label="Workouts completed" value={workoutsCompleted} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Most-used exercises" entries={mostUsedExercises} />
        <ListCard title="Most-used templates" entries={mostUsedTemplates} emptyMessage="No templates used yet." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Most-used equipment" entries={mostUsedEquipment} />
        <ListCard title="Most common goals" entries={mostCommonGoals} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Feedback</h2>
          <span className="text-xs text-slate-500">
            {feedbackRows.length} total · avg rating {averageRating}
            {ratings.length > 0 ? ` (${ratings.length} ratings)` : ""}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {feedbackByType.map((entry) => (
            <span key={entry.label} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {entry.label}: {entry.count}
            </span>
          ))}
        </div>
        <ul className="mt-4 flex flex-col divide-y divide-slate-100">
          {recentFeedback.length === 0 ? (
            <li className="py-3 text-sm text-slate-400">No feedback submitted yet.</li>
          ) : (
            recentFeedback.map((entry, i) => (
              <li key={i} className="flex flex-col gap-1 py-3 first:pt-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{entry.type}</span>
                  {entry.rating !== null && <span>{"★".repeat(entry.rating)}</span>}
                  {entry.page && <span>· {entry.page}</span>}
                  <span>· {new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
                {entry.message && <p className="text-sm text-slate-700">{entry.message}</p>}
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ListCard({ title, entries, emptyMessage }: { title: string; entries: CountEntry[]; emptyMessage?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{emptyMessage ?? "No data yet."}</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-slate-100">
          {entries.map((entry) => (
            <li key={entry.label} className="flex items-center justify-between gap-3 py-2 first:pt-0">
              <span className="truncate text-sm text-slate-700 capitalize">{entry.label.replace(/_/g, " ")}</span>
              <span className="flex-shrink-0 text-sm font-semibold text-slate-900">{entry.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
