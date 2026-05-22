import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Lightweight heartbeat for offline detection (no auth, minimal overhead)
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", ts: Date.now() });
});

export default router;
