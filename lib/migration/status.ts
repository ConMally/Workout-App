import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { MigrationCounts, MigrationOutcome, MigrationStage, MigrationStatusRow } from "./types";

type Row = Database["public"]["Tables"]["migration_status"]["Row"];

// A tab that crashed or was closed mid-import leaves status stuck at
// "importing" forever otherwise — after this long, a fresh claim attempt
// is allowed to treat that lock as abandoned and take over.
const STALE_LOCK_MINUTES = 10;

function toMigrationStatusRow(row: Row): MigrationStatusRow {
  return {
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    batchId: row.batch_id,
    sourceStorageVersion: row.source_storage_version,
    currentStage: (row.current_stage as MigrationStage | null) ?? null,
    importedCounts: (row.imported_counts as MigrationCounts | null) ?? null,
    skippedCounts: (row.skipped_counts as MigrationCounts | null) ?? null,
    failedCounts: (row.failed_counts as MigrationCounts | null) ?? null,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
  };
}

// The signup trigger (handle_new_user in 0001_init.sql) always creates
// this row, so a null result only ever means "not signed in yet" /
// something else is wrong — never a normal state to silently paper over.
export async function getMigrationStatus(
  client: SupabaseClient<Database>,
  userId: string
): Promise<MigrationStatusRow | null> {
  const { data, error } = await client.from("migration_status").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? toMigrationStatusRow(data) : null;
}

export async function markOffered(client: SupabaseClient<Database>, userId: string): Promise<void> {
  const { error } = await client
    .from("migration_status")
    .update({ status: "offered" })
    .eq("user_id", userId)
    .eq("status", "not_started");
  if (error) throw error;
}

export async function markDeferred(client: SupabaseClient<Database>, userId: string): Promise<void> {
  const { error } = await client.from("migration_status").update({ status: "deferred" }).eq("user_id", userId);
  if (error) throw error;
}

export async function markDeclined(client: SupabaseClient<Database>, userId: string): Promise<void> {
  const { error } = await client.from("migration_status").update({ status: "declined" }).eq("user_id", userId);
  if (error) throw error;
}

export interface ClaimResult {
  claimed: boolean;
  batchId: string;
  row: MigrationStatusRow | null;
}

// The database-authoritative lock: a conditional UPDATE that only
// succeeds if the row is currently in a claimable state (never started,
// previously offered/deferred, previously partially failed, or stuck
// "importing" past the staleness window). If two tabs race this exact
// query, PostgREST/Postgres serializes the two UPDATEs and only one can
// match the WHERE clause after the first commits — the loser's row count
// comes back 0, which is the multi-tab guard, not a BroadcastChannel or
// any client-side flag.
export async function claimMigrationLock(
  client: SupabaseClient<Database>,
  userId: string,
  sourceStorageVersion: number
): Promise<ClaimResult> {
  const current = await getMigrationStatus(client, userId);
  const retryCount = current?.status === "partially_failed" ? current.retryCount + 1 : (current?.retryCount ?? 0);
  const batchId = crypto.randomUUID();
  const staleBefore = new Date(Date.now() - STALE_LOCK_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await client
    .from("migration_status")
    .update({
      status: "importing",
      batch_id: batchId,
      source_storage_version: sourceStorageVersion,
      started_at: new Date().toISOString(),
      completed_at: null,
      current_stage: null,
      retry_count: retryCount,
      error_message: null,
    })
    .eq("user_id", userId)
    .or(
      `status.in.(not_started,offered,deferred,partially_failed),and(status.eq.importing,started_at.lt.${staleBefore})`
    )
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return { claimed: data !== null, batchId, row: data ? toMigrationStatusRow(data) : current };
}

export async function updateMigrationStage(
  client: SupabaseClient<Database>,
  userId: string,
  stage: MigrationStage
): Promise<void> {
  const { error } = await client.from("migration_status").update({ current_stage: stage }).eq("user_id", userId);
  if (error) throw error;
}

export async function completeMigration(
  client: SupabaseClient<Database>,
  userId: string,
  outcome: MigrationOutcome
): Promise<void> {
  const { error } = await client
    .from("migration_status")
    .update({
      status: outcome.status,
      completed_at: new Date().toISOString(),
      current_stage: null,
      imported_counts: outcome.imported,
      skipped_counts: outcome.skipped,
      failed_counts: outcome.failed,
      error_message: outcome.errorSummary,
    })
    .eq("user_id", userId);
  if (error) throw error;
}

// Same-device, cross-tab awareness only — never the source of truth (the
// database lock above is). Lets a second tab show "migration is running in
// another tab" without racing the claim, and lets tabs refresh their data
// once a migration finishes elsewhere. BroadcastChannel isn't available in
// every environment (e.g. some embedded webviews), so every caller must
// treat a null return as "no cross-tab signal available" and fall back to
// the database lock alone.
export type MigrationBroadcastMessage =
  | { type: "started"; userId: string; batchId: string }
  | { type: "finished"; userId: string; status: "completed" | "partially_failed" };

export function getMigrationChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel("workout-app-migration");
}
