import { Router } from "express";
import { Resend } from "resend";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  productsTable,
  inventoryItemsTable,
  binsTable,
  zonesTable,
  warehousesTable,
  velocityAlertSettingsTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateAlertConfig, runVelocityAlert, computeAtRiskSkus } from "../lib/velocity-alert";

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendBodySchema = z.object({
  to: z.string().email(),
});

// ── POST /notifications/reorder-alert ─────────────────────────────────────────

router.post("/notifications/reorder-alert", async (req, res) => {
  const parsed = sendBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const { to } = parsed.data;

  // Gather low-stock items (same logic as GET /alerts/low-stock)
  const rows = await db
    .select({
      productId: productsTable.id,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      reorderThreshold: productsTable.reorderThreshold,
      warehouseName: warehousesTable.name,
      warehouseQty: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int`,
    })
    .from(productsTable)
    .leftJoin(inventoryItemsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .leftJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(eq(productsTable.isActive, true))
    .groupBy(
      productsTable.id,
      productsTable.skuCode,
      productsTable.name,
      productsTable.category,
      productsTable.reorderThreshold,
      warehousesTable.name,
    );

  type ProductEntry = {
    productId: string;
    skuCode: string;
    name: string;
    category: string | null;
    reorderThreshold: number;
    totalQty: number;
  };

  const productMap = new Map<string, ProductEntry>();
  for (const row of rows) {
    const existing = productMap.get(row.productId) ?? {
      productId: row.productId,
      skuCode: row.skuCode,
      name: row.name,
      category: row.category,
      reorderThreshold: row.reorderThreshold,
      totalQty: 0,
    };
    existing.totalQty += row.warehouseQty;
    productMap.set(row.productId, existing);
  }

  const alerts = Array.from(productMap.values())
    .filter((p) => p.totalQty <= p.reorderThreshold)
    .map((p) => ({
      ...p,
      shortfall: p.reorderThreshold - p.totalQty,
      severity: p.totalQty === 0 ? "critical" : ("warning" as "critical" | "warning"),
    }))
    .sort((a, b) => b.shortfall - a.shortfall);

  if (alerts.length === 0) {
    res.json({ sent: false, reason: "no_alerts", message: "No low-stock items to report." });
    return;
  }

  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");
  const now = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

  const itemRow = (a: (typeof alerts)[0]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
        <div style="font-weight:600;color:#0f2540;">${a.name}</div>
        <div style="font-size:12px;color:#6b7280;">${a.skuCode}${a.category ? ` · ${a.category}` : ""}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">
        <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700;
          background:${a.severity === "critical" ? "#fee2e2" : "#fef3c7"};
          color:${a.severity === "critical" ? "#dc2626" : "#d97706"};">
          ${a.severity === "critical" ? "OUT OF STOCK" : "LOW STOCK"}
        </span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:600;color:#0f2540;">${a.totalQty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#6b7280;">${a.reorderThreshold}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:600;color:#e8622a;">+${a.shortfall}</td>
    </tr>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0f2540;border-radius:12px 12px 0 0;padding:28px 32px;text-align:left;">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              <span style="color:#e8622a;">Ware</span>IQ
            </div>
            <div style="font-size:14px;color:#94a3b8;margin-top:4px;">Warehouse Management System</div>
          </td>
        </tr>

        <!-- Title bar -->
        <tr>
          <td style="background:#e8622a;padding:16px 32px;">
            <div style="font-size:18px;font-weight:700;color:#ffffff;">
              ⚠ Reorder Alert — ${alerts.length} item${alerts.length !== 1 ? "s" : ""} need attention
            </div>
            <div style="font-size:13px;color:#fde8dc;margin-top:4px;">${now}</div>
          </td>
        </tr>

        <!-- Summary chips -->
        <tr>
          <td style="background:#ffffff;padding:20px 32px 8px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            ${critical.length > 0 ? `<span style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;margin-right:8px;">${critical.length} Out of Stock</span>` : ""}
            ${warning.length > 0 ? `<span style="display:inline-block;background:#fef3c7;color:#d97706;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;">${warning.length} Low Stock</span>` : ""}
          </td>
        </tr>

        <!-- Table -->
        <tr>
          <td style="background:#ffffff;padding:12px 32px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">In Stock</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Threshold</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Shortfall</th>
                </tr>
              </thead>
              <tbody>
                ${alerts.map(itemRow).join("")}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;text-align:center;">
            <a href="${process.env.APP_URL ?? "https://your-wareiq-domain.replit.app"}/purchase-orders/reorder"
               style="display:inline-block;background:#e8622a;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">
              View Reorder Suggestions →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Sent by WareIQ · This alert was triggered manually from the reorder suggestions page.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const subject = critical.length > 0
    ? `🚨 WareIQ: ${critical.length} item${critical.length !== 1 ? "s" : ""} out of stock, ${warning.length} low`
    : `⚠️ WareIQ: ${warning.length} item${warning.length !== 1 ? "s" : ""} low on stock`;

  try {
    const { error } = await resend.emails.send({
      from: "WareIQ Alerts <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      logger.error({ error }, "Resend error");
      res.status(502).json({ sent: false, error: error.message });
      return;
    }

    res.json({ sent: true, to, itemCount: alerts.length });
  } catch (err) {
    logger.error({ err }, "Failed to send reorder alert email");
    res.status(500).json({ sent: false, error: "Failed to send email" });
  }
});

// ── GET /notifications/velocity-alert/config ──────────────────────────────────

router.get("/notifications/velocity-alert/config", async (_req, res) => {
  const config = await getOrCreateAlertConfig();
  res.json(config);
});

// ── PUT /notifications/velocity-alert/config ──────────────────────────────────

const updateConfigSchema = z.object({
  thresholdDays: z.number().int().min(1).max(365).optional(),
  lookbackDays: z.number().int().min(7).max(365).optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  enabled: z.boolean().optional(),
});

router.put("/notifications/velocity-alert/config", async (req, res) => {
  const parsed = updateConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const config = await getOrCreateAlertConfig();
  const [updated] = await db
    .update(velocityAlertSettingsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(velocityAlertSettingsTable.id, config.id))
    .returning();

  res.json(updated);
});

// ── POST /notifications/velocity-alert/send ───────────────────────────────────

router.post("/notifications/velocity-alert/send", async (_req, res) => {
  const config = await getOrCreateAlertConfig();

  if (!config.recipientEmail) {
    res.status(400).json({ sent: false, reason: "no_email", message: "No recipient email configured.", skuCount: null, to: null });
    return;
  }

  const result = await runVelocityAlert(config.recipientEmail, config.thresholdDays, config.lookbackDays);
  res.json({ ...result, to: config.recipientEmail });
});

// ── GET /notifications/velocity-alert/preview ────────────────────────────────

router.get("/notifications/velocity-alert/preview", async (req, res) => {
  const config = await getOrCreateAlertConfig();
  const thresholdDays = parseInt((req.query.threshold as string) ?? String(config.thresholdDays), 10) || config.thresholdDays;
  const lookbackDays = parseInt((req.query.lookback as string) ?? String(config.lookbackDays), 10) || config.lookbackDays;
  const atRisk = await computeAtRiskSkus(lookbackDays, thresholdDays);
  res.json({ thresholdDays, lookbackDays, atRiskCount: atRisk.length, skus: atRisk });
});

export default router;
