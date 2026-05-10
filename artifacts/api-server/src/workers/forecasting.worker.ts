import { Worker, type Job } from "bullmq";
import { connection } from "./queue";
import { logger } from "../lib/logger";
import { updateAllForecasts } from "../engines/forecasting/engine";

export const forecastingWorker = new Worker("forecasting", async (job: Job) => {
  logger.info({ jobId: job.id, jobName: job.name }, "Processing forecasting job");
  if (job.name === "update-forecasts") {
    return await updateAllForecasts();
  }
  return { skipped: true, reason: "unknown job name" };
}, { connection });

forecastingWorker.on("completed", (job) => logger.info({ jobId: job.id }, "Forecasting job completed"));
forecastingWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Forecasting job failed"));
