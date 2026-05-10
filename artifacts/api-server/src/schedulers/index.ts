// ── Scheduler Entry Point ───────────────────────────────────────────────────────
// Replaces lib/scheduler.ts. Uses BullMQ repeatable jobs instead of node-cron.
// node-cron kept for backward compat during transition.

import { logger } from "../lib/logger";
import { initializeScheduledJobs } from "../workers/queue";

export async function startSchedulers(): Promise<void> {
  try {
    await initializeScheduledJobs();
    logger.info("BullMQ schedulers started");
  } catch (err) {
    logger.error({ err }, "Failed to start BullMQ schedulers — falling back to node-cron");
    // Fallback: keep old scheduler running
    const { startScheduler } = await import("../lib/scheduler");
    startScheduler();
  }
}
