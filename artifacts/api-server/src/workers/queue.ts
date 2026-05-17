// ── BullMQ Queue Setup ──────────────────────────────────────────────────────────
// Graceful fallback when Redis is unavailable (local dev without Redis).

import { Queue, type ConnectionOptions, type Queue as QueueType } from "bullmq";
import { logger } from "../lib/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const connection: ConnectionOptions = { url: REDIS_URL, maxRetriesPerRequest: null };

function createQueue(name: string): QueueType | null {
  try {
    return new Queue(name, { connection });
  } catch (e) {
    logger.warn({ queue: name, e }, "Redis unavailable — BullMQ queue disabled");
    return null;
  }
}

export const replenishmentQueue = createQueue("replenishment");
export const alertQueue = createQueue("alerts");
export const slottingQueue = createQueue("slotting");
export const forecastingQueue = createQueue("forecasting");
export const planningQueue = createQueue("planning");

export async function initializeScheduledJobs(): Promise<void> {
  const jobs = [
    { queue: replenishmentQueue, name: "check-reorder-points", pattern: "0 8 * * *", jobId: "daily-replenishment-check" },
    { queue: slottingQueue, name: "review-slotting", pattern: "0 2 * * 0", jobId: "weekly-slotting-review" },
    { queue: forecastingQueue, name: "update-forecasts", pattern: "0 6 * * *", jobId: "daily-forecast-update" },
    { queue: planningQueue, name: "planning-cycle", pattern: "0 4 1 * *", jobId: "monthly-planning-cycle" },
  ];

  for (const job of jobs) {
    if (!job.queue) {
      logger.warn({ job: job.name }, "Queue unavailable — skipping scheduled job");
      continue;
    }
    try {
      await job.queue.upsertJobScheduler(job.jobId, { pattern: job.pattern }, { name: job.name });
    } catch {
      try {
        await job.queue.add(job.name, {}, { repeat: { pattern: job.pattern }, jobId: job.jobId });
      } catch (e) {
        logger.warn({ job: job.name, e }, "Could not schedule job");
      }
    }
  }
  logger.info("Scheduled jobs initialized (unavailable queues skipped)");
}
