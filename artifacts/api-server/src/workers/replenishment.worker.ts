import { Worker, type Job } from "bullmq";
import { connection, replenishmentQueue } from "./queue";
import { logger } from "../lib/logger";
import { runReplenishmentCheck } from "../engines/replenishment/engine";

export const replenishmentWorker = replenishmentQueue
  ? new Worker("replenishment", async (job: Job) => {
      logger.info({ jobId: job.id, jobName: job.name }, "Processing replenishment job");
      if (job.name === "check-reorder-points") {
        const result = await runReplenishmentCheck();
        logger.info({ result }, "Replenishment check completed");
        return result;
      }
      return { skipped: true, reason: "unknown job name" };
    }, { connection })
  : null;

if (replenishmentWorker) {
  replenishmentWorker.on("completed", (job) => logger.info({ jobId: job.id }, "Replenishment job completed"));
  replenishmentWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Replenishment job failed"));
}
