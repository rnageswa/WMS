import { Worker, type Job } from "bullmq";
import { connection } from "./queue";
import { logger } from "../lib/logger";
import { getOrCreateAlertConfig, runVelocityAlert } from "../lib/velocity-alert";
import { detectAnomalies } from "../engines/replenishment/anomaly-detector";

export const alertWorker = new Worker("alerts", async (job: Job) => {
  logger.info({ jobId: job.id, jobName: job.name }, "Processing alert job");
  if (job.name === "velocity-alert") {
    const config = await getOrCreateAlertConfig();
    if (!config.enabled || !config.recipientEmail) return { skipped: true };
    return await runVelocityAlert(config.recipientEmail, config.thresholdDays, config.lookbackDays, "scheduler");
  }
  if (job.name === "anomaly-detection") {
    const anomalies = await detectAnomalies();
    return { anomaliesDetected: anomalies.length };
  }
  return { skipped: true, reason: "unknown job name" };
}, { connection });

alertWorker.on("completed", (job) => logger.info({ jobId: job.id }, "Alert job completed"));
alertWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Alert job failed"));
