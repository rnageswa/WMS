import cron from "node-cron";
import { logger } from "./logger";
import { getOrCreateAlertConfig, runVelocityAlert } from "./velocity-alert";

export function startScheduler() {
  // Run daily at 08:00 server time
  cron.schedule("0 8 * * *", async () => {
    logger.info("Running scheduled velocity alert check");
    try {
      const config = await getOrCreateAlertConfig();

      if (!config.enabled) {
        logger.info("Velocity alert is disabled — skipping");
        return;
      }
      if (!config.recipientEmail) {
        logger.info("Velocity alert: no recipient email set — skipping");
        return;
      }

      const result = await runVelocityAlert(
        config.recipientEmail,
        config.thresholdDays,
        config.lookbackDays
      );
      logger.info({ result }, "Scheduled velocity alert completed");
    } catch (err) {
      logger.error({ err }, "Scheduled velocity alert failed");
    }
  });

  logger.info("Velocity alert scheduler started (daily at 08:00)");
}
