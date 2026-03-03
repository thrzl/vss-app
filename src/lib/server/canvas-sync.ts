/**
 * Canvas Sync Service
 *
 * Merges Canvas LMS assignments into local tasks.  Respects local edits
 * (a task edited locally after its last sync will not be overwritten) and
 * auto-completes tasks whose Canvas submission is graded/submitted.
 *
 * The `lastSyncAt` timestamp on the integration row is only written at the
 * very end of a fully-successful sync so that a partial failure will simply
 * retry on the next login.
 */

import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  tasks,
  canvasIntegrations,
  canvasSyncLogs,
  type CanvasIntegration,
} from "$lib/schema";
import {
  fetchAllCanvasTasks,
  type NormalisedCanvasTask,
  CanvasApiError,
} from "./canvas-api";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SyncResult {
  created: number;
  updated: number;
  completed: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Threshold — minimum time (ms) between automatic syncs
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Should we sync?
// ---------------------------------------------------------------------------

/**
 * Returns `true` when enough time has elapsed since the last successful
 * sync (or if the user has never synced).
 */
export function shouldSync(integration: CanvasIntegration): boolean {
  if (!integration.lastSyncAt) return true;
  const last = new Date(integration.lastSyncAt).getTime();
  return Date.now() - last >= SYNC_INTERVAL_MS;
}

// ---------------------------------------------------------------------------
// Main sync entry-point
// ---------------------------------------------------------------------------

/**
 * Run a full Canvas → local sync for a single user.
 *
 * 1. Fetch every published assignment from every active course.
 * 2. For each assignment decide whether to CREATE, UPDATE, or SKIP.
 * 3. Auto-complete local tasks whose Canvas submission is now graded.
 * 4. Write `lastSyncAt` only after everything succeeds.
 */
export async function syncCanvasTasks(
  db: DrizzleD1Database,
  userId: string,
  integration: CanvasIntegration,
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    completed: 0,
    errors: [],
  };

  let canvasTasks: NormalisedCanvasTask[];

  try {
    canvasTasks = await fetchAllCanvasTasks(
      integration.canvasUrl,
      integration.apiToken,
    );
  } catch (err) {
    const message =
      err instanceof CanvasApiError
        ? `Canvas API error (${err.status}): ${err.message}`
        : `Failed to fetch Canvas tasks: ${String(err)}`;

    result.errors.push(message);
    await logSync(db, userId, "error", result, message);
    return result;
  }

  // -----------------------------------------------------------------------
  // Fetch all existing Canvas-sourced tasks for this user in one query
  // -----------------------------------------------------------------------

  const existingTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.owner, userId), eq(tasks.source, "canvas")));

  // Index by canvasId for O(1) lookups
  const existingByCanvasId = new Map(existingTasks.map((t) => [t.canvasId, t]));

  const now = new Date().toISOString();

  // -----------------------------------------------------------------------
  // Process every Canvas assignment
  // -----------------------------------------------------------------------

  for (const ct of canvasTasks) {
    try {
      const existing = existingByCanvasId.get(ct.canvasId);

      if (!existing) {
        // ── CREATE ─────────────────────────────────────────────────────
        await db.insert(tasks).values({
          title: ct.title,
          description: ct.description,
          canvasDescription: ct.description,
          status: ct.isCompleted ? 1 : 0,
          owner: userId,
          url: ct.url,
          dueAt: ct.dueAt,
          completedAt: ct.isCompleted ? now : null,
          canvasId: ct.canvasId,
          canvasCourseId: ct.canvasCourseId,
          source: "canvas",
          syncedAt: now,
          lastLocalEdit: null,
        });
        result.created++;

        if (ct.isCompleted) {
          result.completed++;
        }
      } else {
        // ── UPDATE (with conflict resolution) ──────────────────────────
        //
        // If the user edited the task locally *after* the last sync we
        // respect their changes and only touch sync metadata + completion
        // status from Canvas.
        //
        const userEditedLocally =
          existing.lastLocalEdit != null &&
          existing.syncedAt != null &&
          existing.lastLocalEdit > existing.syncedAt;

        const updates: Record<string, unknown> = {
          syncedAt: now,
        };

        if (!userEditedLocally) {
          // Safe to overwrite from Canvas
          updates.title = ct.title;
          updates.description = ct.description;
          updates.dueAt = ct.dueAt;
          updates.url = ct.url;
          updates.canvasCourseId = ct.canvasCourseId;
        }

        // Always update the Canvas snapshot regardless of local edits
        // so we can detect future Canvas-side changes
        updates.canvasDescription = ct.description;

        // Auto-complete: Canvas says it's done but local task is still
        // active.  We apply this regardless of local edits — the student
        // completed it in Canvas.
        if (ct.isCompleted && (existing.status ?? 0) === 0) {
          updates.status = 1;
          updates.completedAt = now;
          result.completed++;
        }

        // If anything actually changed, write the row
        const hasChanges = Object.keys(updates).length > 1; // >1 because syncedAt is always present
        if (hasChanges || updates.syncedAt) {
          await db.update(tasks).set(updates).where(eq(tasks.id, existing.id));
          result.updated++;
        }
      }
    } catch (err) {
      const msg = `Failed to sync assignment ${ct.canvasId}: ${String(err)}`;
      console.error(`[canvas-sync]`, msg);
      result.errors.push(msg);
    }
  }

  // -----------------------------------------------------------------------
  // Finalise
  // -----------------------------------------------------------------------

  // Only stamp lastSyncAt when there are no errors — a partial failure
  // means we should retry the whole thing next time.
  if (result.errors.length === 0) {
    await db
      .update(canvasIntegrations)
      .set({ lastSyncAt: now })
      .where(eq(canvasIntegrations.id, integration.id));

    await logSync(db, userId, "success", result);
  } else {
    await logSync(db, userId, "partial", result, result.errors.join(" | "));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logSync(
  db: DrizzleD1Database,
  userId: string,
  status: "success" | "error" | "partial",
  result: SyncResult,
  errorMessage?: string,
): Promise<void> {
  try {
    await db.insert(canvasSyncLogs).values({
      id: crypto.randomUUID(),
      userId,
      status,
      tasksCreated: result.created,
      tasksUpdated: result.updated,
      tasksCompleted: result.completed,
      errorMessage: errorMessage ?? null,
    });
  } catch (err) {
    // Logging should never break the sync flow
    console.error("[canvas-sync] Failed to write sync log:", err);
  }
}

// ---------------------------------------------------------------------------
// Integration lookup helper (used by hooks / routes)
// ---------------------------------------------------------------------------

/**
 * Fetch the Canvas integration row for a user, or `null` if they haven't
 * connected Canvas yet.
 */
export async function getCanvasIntegration(
  db: DrizzleD1Database,
  userId: string,
): Promise<CanvasIntegration | null> {
  const [row] = await db
    .select()
    .from(canvasIntegrations)
    .where(eq(canvasIntegrations.userId, userId))
    .limit(1);

  return row ?? null;
}
