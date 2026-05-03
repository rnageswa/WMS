import { db } from "@workspace/db";
import {
  productsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
  velocityAlertSettingsTable,
  skuAlertOverridesTable,
  alertSendLogTable,
} from "@workspace/db/schema";
import { eq, gte, sql, count, max } from "drizzle-orm";
import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

export type AtRiskSku = {
  skuCode: string;
  name: string;
  category: string;
  velocityPerDay: number;
  currentStock: number;
  reorderThreshold: number;
  daysOfStockRemaining: number | null;
  overrideMode: "always" | "never" | null;
};

// ─── Shared velocity computation ─────────────────────────────────────────────

export async function computeAtRiskSkus(
  lookbackDays: number,
  thresholdDays: number
): Promise<AtRiskSku[]> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const [movementRows, stockRows, products, overrideRows] = await Promise.all([
    db
      .select({
        productId: inventoryMovementsTable.productId,
        totalMoves: count(inventoryMovementsTable.id),
        unitsIn: sql<number>`coalesce(sum(case when ${inventoryMovementsTable.movementType} = 'inbound' then abs(${inventoryMovementsTable.quantity}) else 0 end), 0)::int`,
        unitsOut: sql<number>`coalesce(sum(case when ${inventoryMovementsTable.movementType} = 'outbound' then abs(${inventoryMovementsTable.quantity}) else 0 end), 0)::int`,
        lastMovementAt: max(inventoryMovementsTable.createdAt),
      })
      .from(inventoryMovementsTable)
      .where(gte(inventoryMovementsTable.createdAt, since))
      .groupBy(inventoryMovementsTable.productId),

    db
      .select({
        productId: inventoryItemsTable.productId,
        currentStock: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int`,
      })
      .from(inventoryItemsTable)
      .groupBy(inventoryItemsTable.productId),

    db
      .select({
        id: productsTable.id,
        skuCode: productsTable.skuCode,
        name: productsTable.name,
        category: productsTable.category,
        reorderThreshold: productsTable.reorderThreshold,
      })
      .from(productsTable)
      .where(eq(productsTable.isActive, true)),

    db.select().from(skuAlertOverridesTable),
  ]);

  const movMap = new Map(movementRows.map((r) => [r.productId, r]));
  const stockMap = new Map(stockRows.map((r) => [r.productId, r.currentStock]));
  const overrideMap = new Map(overrideRows.map((r) => [r.productId, r.mode as "always" | "never"]));

  const atRisk: AtRiskSku[] = [];

  for (const p of products) {
    const overrideMode = overrideMap.get(p.id) ?? null;

    // Never-alert SKUs are always excluded
    if (overrideMode === "never") continue;

    const m = movMap.get(p.id);
    const unitsIn = m ? Number(m.unitsIn) : 0;
    const unitsOut = m ? Number(m.unitsOut) : 0;
    const totalUnitsMoved = unitsIn + unitsOut;
    const velocityPerDay =
      lookbackDays > 0 ? Math.round((totalUnitsMoved / lookbackDays) * 100) / 100 : 0;
    const currentStock = stockMap.get(p.id) ? Number(stockMap.get(p.id)) : 0;

    const daysOfStockRemaining =
      velocityPerDay > 0 ? Math.round(currentStock / velocityPerDay) : null;

    // Always-alert SKUs are included regardless of threshold
    const isAtRisk =
      overrideMode === "always" ||
      (daysOfStockRemaining !== null && daysOfStockRemaining < thresholdDays);

    if (isAtRisk) {
      atRisk.push({
        skuCode: p.skuCode,
        name: p.name,
        category: p.category ?? "Uncategorized",
        velocityPerDay,
        currentStock,
        reorderThreshold: p.reorderThreshold,
        daysOfStockRemaining,
        overrideMode,
      });
    }
  }

  return atRisk.sort((a, b) => {
    // Always-alert SKUs with null days go to the bottom of the list
    if (a.daysOfStockRemaining === null) return 1;
    if (b.daysOfStockRemaining === null) return -1;
    return a.daysOfStockRemaining - b.daysOfStockRemaining;
  });
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildVelocityAlertEmail(
  skus: AtRiskSku[],
  thresholdDays: number,
  lookbackDays: number
): string {
  const now = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const urgent = skus.filter((s) => s.daysOfStockRemaining !== null && s.daysOfStockRemaining <= 7);
  const caution = skus.filter((s) => s.daysOfStockRemaining === null || s.daysOfStockRemaining > 7);

  const urgencyColor = (s: AtRiskSku) =>
    s.daysOfStockRemaining !== null && s.daysOfStockRemaining <= 7 ? "#dc2626" : "#d97706";
  const urgencyBg = (s: AtRiskSku) =>
    s.daysOfStockRemaining !== null && s.daysOfStockRemaining <= 7 ? "#fee2e2" : "#fef3c7";
  const runwayLabel = (s: AtRiskSku) =>
    s.daysOfStockRemaining !== null
      ? `${s.daysOfStockRemaining}d remaining`
      : s.overrideMode === "always"
      ? "Always alerted"
      : "No velocity data";

  const skuRow = (s: AtRiskSku) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
        <div style="font-weight:600;color:#0f2540;">${s.name}</div>
        <div style="font-size:12px;color:#6b7280;">${s.skuCode}${s.category ? ` · ${s.category}` : ""}${s.overrideMode === "always" ? ' · <span style="color:#7c3aed;">pinned</span>' : ""}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;
          background:${urgencyBg(s)};color:${urgencyColor(s)};">
          ${runwayLabel(s)}
        </span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:600;color:#0f2540;">${s.currentStock}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#6b7280;">${s.velocityPerDay > 0 ? `${s.velocityPerDay}/day` : "—"}</td>
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
            ${caution.length > 0 ? `<span style="display:inline-block;background:#fef3c7;color:#d97706;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;">${caution.length} caution (≤${thresholdDays} days)</span>` : ""}
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
  lookbackDays: number,
  triggeredBy: "scheduler" | "manual" = "manual"
): Promise<{ sent: boolean; skuCount: number | null; reason: string | null; message: string | null }> {
  const atRisk = await computeAtRiskSkus(lookbackDays, thresholdDays);

  if (atRisk.length === 0) {
    return { sent: false, skuCount: 0, reason: "no_alerts", message: `No SKUs have fewer than ${thresholdDays} days of stock remaining.` };
  }

  const html = buildVelocityAlertEmail(atRisk, thresholdDays, lookbackDays);
  const urgent = atRisk.filter((s) => s.daysOfStockRemaining !== null && s.daysOfStockRemaining <= 7);
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

    const now = new Date();
    await Promise.all([
      db.update(velocityAlertSettingsTable).set({ lastSentAt: now, updatedAt: now }),
      db.insert(alertSendLogTable).values({
        recipientEmail: to,
        skuCount: atRisk.length,
        thresholdDays,
        lookbackDays,
        triggeredBy,
        skus: atRisk.map((s) => ({
          skuCode: s.skuCode,
          name: s.name,
          daysOfStockRemaining: s.daysOfStockRemaining,
          velocityPerDay: s.velocityPerDay,
          currentStock: s.currentStock,
        })),
      }),
    ]);

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
