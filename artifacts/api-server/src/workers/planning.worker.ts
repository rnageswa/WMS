import { Worker, type Job } from "bullmq";
import { connection } from "./queue";
import { logger } from "../lib/logger";
import { runPlanningCycle } from "../engines/planning/engine";

export const planningWorker = new Worker("planning", async (job: Job) => {
  logger.info({ jobId: job.id, jobName: job.name }, "Processing planning job");
  if (job.name === "planning-cycle") {
    return await runPlanningCycle();
  }
  return { skipped: true, reason: "unknown job name" };
}, { connection });

planningWorker.on("completed", (job) => logger.info({ jobId: job.id }, "Planning job completed"));
planningWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Planning job failed"));
