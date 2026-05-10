import { Worker, type Job } from "bullmq";
import { connection } from "./queue";
import { logger } from "../lib/logger";
import { runSlottingOptimization } from "../engines/slotting/engine";

export const slottingWorker = new Worker("slotting", async (job: Job) => {
  logger.info({ jobId: job.id, jobName: job.name }, "Processing slotting job");
  if (job.name === "review-slotting") {
    return await runSlottingOptimization();
  }
  return { skipped: true, reason: "unknown job name" };
}, { connection });

slottingWorker.on("completed", (job) => logger.info({ jobId: job.id }, "Slotting job completed"));
slottingWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Slotting job failed"));
