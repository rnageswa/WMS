import { db } from "@workspace/db";
import {
  productsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
  velocityAlertSettingsTable,
} from "@workspace/db/schema";
import { eq, gte, sql, count, max } from "drizzle-orm";
import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Shared velocity computation ─────────────────────────────────────────────

export type AtRiskSku = {
  skuCode: string;
  name: string;
  category: string;
  velocityPerDay: number;
  currentStock: number;
  reorderThreshold: number;
  daysOfStockRemaining: number;
};

export async function computeAtRiskSkus(
  lookbackDays: number,
  thresholdDays: number
): Promise<AtRiskSku[]> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const movementRows = await db
    .select({
      productId: inventoryMovementsTable.productId,
      totalMoves: count(inventoryMovementsTable.id),
      unitsIn: sql<number>`coalesce(sum(case when ${inventoryMovementsTable.movementType} = 'inbound' then abs(${inventoryMovementsTable.quantity}) else 0 end), 0)::int`,
      unitsOut: sql<number>`coalesce(sum(case when ${inventoryMovementsTable.movementType} = 'outbound' then abs(${inventoryMovementsTable.quantity}) else 0 end), 0)::int`,
      lastMovementAt: max(inventoryMovementsTable.createdAt),
    })
    .from(inventoryMovementsTable)
    .where(gte(inventoryMovementsTable.createdAt, since))
    .groupBy(inventoryMovementsTable.productId);

  const stockRows = await db
    .select({
      productId: inventoryItemsTable.productId,
      currentStock: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int`,
    })
    .from(inventoryItemsTable)
    .groupBy(inventoryItemsTable.productId);

  const products = await db
    .select({
      id: productsTable.id,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      reorderThreshold: productsTable.reorderThreshold,
    })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  const movMap = new Map(movementRows.map((r) => [r.productId, r]));
  const stockMap = new Map(stockRows.map((r) => [r.productId, r.currentStock]));

  const atRisk: AtRiskSku[] = [];

  for (const p of products) {
    const m = movMap.get(p.id);
    const unitsIn = m ? Number(m.unitsIn) : 0;
    const unitsOut = m ? Number(m.unitsOut) : 0;
    const totalUnitsMoved = unitsIn + unitsOut;
    const velocityPerDay =
      lookbackDays > 0 ? Math.round((totalUnitsMoved / lookbackDays) * 100) / 100 : 0;
    const currentStock = stockMap.get(p.id) ? Number(stockMap.get(p.id)) : 0;

    if (velocityPerDay <= 0) continue;

    const daysOfStockRemaining = Math.round(currentStock / velocityPerDay);
    if (daysOfStockRemaining < thresholdDays) {
      atRisk.push({
        skuCode: p.skuCode,
        name: p.name,
        category: p.category ?? "Uncategorized",
        velocityPerDay,
        currentStock,
        reorderThreshold: p.reorderThreshold,
        daysOfStockRemaining,
      });
    }
  }

  return atRisk.sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining);
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildVelocityAlertEmail(
  skus: AtRiskSku[],
  thresholdDays: number,
  lookbackDays: number
): string {
  const now = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const urgent = skus.filter((s) => s.daysOfStockRemaining <= 7);
  const caution = skus.filter((s) => s.daysOfStockRemaining > 7);

  const urgencyColor = (days: number) =>
    days <= 7 ? "#dc2626" : "#d97706";
  const urgencyBg = (days: number) =>
    days <= 7 ? "#fee2e2" : "#fef3c7";

  const skuRow = (s: AtRiskSku) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
        <div style="font-weight:600;color:#0f2540;">${s.name}</div>
        <div style="font-size:12px;color:#6b7280;">${s.skuCode}${s.category ? ` · ${s.category}` : ""}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;
          background:${urgencyBg(s.daysOfStockRemaining)};color:${urgencyColor(s.daysOfStockRemaining)};">
          ${s.daysOfStockRemaining}d remaining
        </span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:600;color:#0f2540;">${s.currentStock}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#6b7280;">${s.velocityPerDay}/day</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#6b7280;">${s.reorderThreshold}</td>
    </tr>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr>
          <td style="background:#0f2540;border-radius:12px 12px 0 0;padding:28px 32px;">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              <span style="color:#e8622a;">Ware</span>IQ
            </div>
            <div style="font-size:14px;color:#94a3b8;margin-top:4px;">Warehouse Management System</div>
          </td>
        </tr>

        <tr>
          <td style="background:#e8622a;padding:16px 32px;">
            <div style="font-size:18px;font-weight:700;color:#ffffff;">
              ⚡ Stock Velocity Alert — ${skus.length} SKU${skus.length !== 1 ? "s" : ""} below ${thresholdDays}-day runway
            </div>
            <div style="font-size:13px;color:#fde8dc;margin-top:4px;">${now} · Based on last ${lookbackDays} days of movement</div>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;padding:20px 32px 8px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            ${urgent.length > 0 ? `<span style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;margin-right:8px;">🚨 ${urgent.length} critical (≤7 days)</span>` : ""}
            ${caution.length > 0 ? `<span style="display:inline-block;background:#fef3c7;color:#d97706;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;">⚠ ${caution.length} caution (≤${thresholdDays} days)</span>` : ""}
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;padding:12px 32px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Runway</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Stock</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Velocity</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Threshold</th>
                </tr>
              </thead>
              <tbody>
                ${skus.map(skuRow).join("")}
              </tbody>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;text-align:center;">
            <a href="${process.env.APP_URL ?? "https://your-wareiq-domain.replit.app"}/reports"
               style="display:inline-block;background:#e8622a;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">
              View Stock Velocity Report →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:#f8fafc;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Sent by WareIQ · Velocity alert triggers daily when stock runway falls below ${thresholdDays} days.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Main send function ───────────────────────────────────────────────────────

export async function runVelocityAlert(
  to: string,
  thresholdDays: number,
  lookbackDays: number
): Promise<{ sent: boolean; skuCount: number | null; reason: string | null; message: string | null }> {
  const atRisk = await computeAtRiskSkus(lookbackDays, thresholdDays);

  if (atRisk.length === 0) {
    return { sent: false, skuCount: 0, reason: "no_alerts", message: `No SKUs have fewer than ${thresholdDays} days of stock remaining.` };
  }

  const html = buildVelocityAlertEmail(atRisk, thresholdDays, lookbackDays);
  const urgent = atRisk.filter((s) => s.daysOfStockRemaining <= 7);
  const subject =
    urgent.length > 0
      ? `🚨 WareIQ: ${urgent.length} SKU${urgent.length !== 1 ? "s" : ""} running out within 7 days`
      : `⚡ WareIQ: ${atRisk.length} SKU${atRisk.length !== 1 ? "s" : ""} below ${thresholdDays}-day stock runway`;

  try {
    const { error } = await resend.emails.send({
      from: "WareIQ Alerts <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      logger.error({ error }, "Resend error sending velocity alert");
      return { sent: false, skuCount: atRisk.length, reason: "send_error", message: error.message };
    }

    // Update lastSentAt
    await db
      .update(velocityAlertSettingsTable)
      .set({ lastSentAt: new Date(), updatedAt: new Date() });

    return { sent: true, skuCount: atRisk.length, reason: null, message: `Alert sent for ${atRisk.length} at-risk SKU${atRisk.length !== 1 ? "s" : ""}.` };
  } catch (err) {
    logger.error({ err }, "Failed to send velocity alert email");
    return { sent: false, skuCount: atRisk.length, reason: "send_error", message: "Unexpected error sending email" };
  }
}

// ─── Load current config (or seed defaults) ───────────────────────────────────

export async function getOrCreateAlertConfig() {
  const rows = await db.select().from(velocityAlertSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(velocityAlertSettingsTable)
    .values({})
    .returning();
  return created;
}
