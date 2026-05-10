// ── BullMQ Queue Setup ──────────────────────────────────────────────────────────

import { Queue, type ConnectionOptions } from "bullmq";
import { logger } from "../lib/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const connection: ConnectionOptions = { url: REDIS_URL, maxRetriesPerRequest: null };

export const replenishmentQueue = new Queue("replenishment", { connection });
export const alertQueue = new Queue("alerts", { connection });
export const slottingQueue = new Queue("slotting", { connection });
export const forecastingQueue = new Queue("forecasting", { connection });
export const planningQueue = new Queue("planning", { connection });

export async function initializeScheduledJobs(): Promise<void> {
  // Schedule repeatable jobs (BullMQ v5 API)
  const jobs = [
    { queue: replenishmentQueue, name: "check-reorder-points", pattern: "0 8 * * *", jobId: "daily-replenishment-check" },
    { queue: slottingQueue, name: "review-slotting", pattern: "0 2 * * 0", jobId: "weekly-slotting-review" },
    { queue: forecastingQueue, name: "update-forecasts", pattern: "0 6 * * *", jobId: "daily-forecast-update" },
    { queue: planningQueue, name: "planning-cycle", pattern: "0 4 1 * *", jobId: "monthly-planning-cycle" },
  ];

  for (const job of jobs) {
    try {
      await job.queue.upsertJobScheduler(job.jobId, { pattern: job.pattern }, { name: job.name });
    } catch {
      // BullMQ version may not support upsertJobScheduler — fallback to add with repeat
      try {
        await job.queue.add(job.name, {}, { repeat: { pattern: job.pattern }, jobId: job.jobId });
      } catch (e) {
        logger.warn({ job: job.name, e }, "Could not schedule job");
      }
    }
  }
  logger.info("All scheduled jobs initialized");
}
