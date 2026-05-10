// ── Engine API Routes ───────────────────────────────────────────────────────────
// Thin controllers that delegate to engines. All routes require auth.

import { Router } from "express";
import { runReplenishmentCheck, classifyAllProducts, updateAllSupplierPerformance } from "../engines/replenishment";
import { runSlottingOptimization, generateHeatmap, analyzeCoPickProximity } from "../engines/slotting";
import { forecastProduct, updateAllForecasts } from "../engines/forecasting";
import { runPlanningCycle, generateInventoryPlans, generateDistributionPlans } from "../engines/planning";
import { z } from "zod";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// REPLENISHMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/engines/replenishment/run — Run full replenishment check
router.post("/engines/replenishment/run", async (_req, res) => {
  try {
    const result = await runReplenishmentCheck();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engines/replenishment/classify — Classify all products
router.get("/engines/replenishment/classify", async (_req, res) => {
  try {
    const result = await classifyAllProducts();
    res.json({ total: result.length, classifications: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engines/suppliers/performance — Update all supplier performance
router.post("/engines/suppliers/performance", async (_req, res) => {
  try {
    await updateAllSupplierPerformance();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLOTTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/engines/slotting/run — Run slotting optimization
router.post("/engines/slotting/run", async (_req, res) => {
  try {
    const result = await runSlottingOptimization();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engines/slotting/heatmap — Get bin heatmap
router.get("/engines/slotting/heatmap", async (req, res) => {
  try {
    const { zoneId } = req.query;
    const result = await generateHeatmap(zoneId as string | undefined);
    res.json({ total: result.length, heatmap: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engines/slotting/co-pick — Co-pick proximity analysis
router.get("/engines/slotting/co-pick", async (_req, res) => {
  try {
    const result = await analyzeCoPickProximity();
    res.json({ total: result.length, groups: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORECASTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/engines/forecast/:productId — Forecast for a product
router.get("/engines/forecast/:productId", async (req, res) => {
  const { productId } = req.params;
  const days = parseInt(req.query.days as string, 10) || 90;
  try {
    const result = await forecastProduct(productId, days);
    if (!result) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engines/forecast/update-all — Update all forecasts
router.post("/engines/forecast/update-all", async (_req, res) => {
  try {
    const result = await updateAllForecasts();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLANNING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/engines/planning/run — Run full planning cycle
router.post("/engines/planning/run", async (_req, res) => {
  try {
    const result = await runPlanningCycle();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engines/planning/inventory — Get inventory plans
router.get("/engines/planning/inventory", async (_req, res) => {
  try {
    const result = await generateInventoryPlans();
    res.json({ total: result.length, plans: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engines/planning/distribution — Get distribution plans
router.get("/engines/planning/distribution", async (_req, res) => {
  try {
    const result = await generateDistributionPlans();
    res.json({ total: result.length, plans: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
