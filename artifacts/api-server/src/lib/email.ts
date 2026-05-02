import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export interface PoLine {
  skuCode: string | null;
  productName: string | null;
  qtyOrdered: number;
  unitCost: number | null;
}

export interface SendPoEmailOptions {
  to: string;
  poNumber: string;
  supplierName: string;
  notes: string | null | undefined;
  lines: PoLine[];
  fromName?: string;
}

function buildPoHtml(opts: SendPoEmailOptions): string {
  const { poNumber, supplierName, notes, lines, fromName = "WareIQ" } = opts;
  const totalQty = lines.reduce((s, l) => s + l.qtyOrdered, 0);
  const totalValue = lines.reduce((s, l) => {
    return l.unitCost != null ? s + l.unitCost * l.qtyOrdered : s;
  }, 0);
  const hasUnitCosts = lines.some((l) => l.unitCost != null);

  const lineRows = lines
    .map(
      (l) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-family:monospace;font-size:13px;color:#666;">${l.skuCode ?? "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${l.productName ?? "Unknown product"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;font-weight:600;">${l.qtyOrdered}</td>
      ${hasUnitCosts ? `<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;color:#555;">${l.unitCost != null ? `$${l.unitCost.toFixed(2)}` : "—"}</td>` : ""}
      ${hasUnitCosts ? `<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;">${l.unitCost != null ? `$${(l.unitCost * l.qtyOrdered).toFixed(2)}` : "—"}</td>` : ""}
    </tr>`
    )
    .join("");

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#1a2332;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="color:#E8622A;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WareIQ</div>
                <div style="color:#8896a8;font-size:12px;margin-top:2px;">Warehouse Management System</div>
              </td>
              <td align="right">
                <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">${poNumber}</div>
                <div style="color:#8896a8;font-size:12px;margin-top:2px;">${date}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">

          <p style="margin:0 0 4px;font-size:14px;color:#888;">Dear</p>
          <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#1a2332;">${supplierName}</p>

          <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.6;">
            Please find below our purchase order <strong>${poNumber}</strong>. Kindly confirm receipt of this order and advise on expected delivery date.
          </p>

          ${notes ? `<div style="background:#fef9f5;border-left:3px solid #E8622A;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:24px;font-size:13px;color:#555;line-height:1.6;">${notes}</div>` : ""}

          <!-- Line Items Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;">SKU</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;">Product</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;">Qty</th>
                ${hasUnitCosts ? `<th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;">Unit Price</th>` : ""}
                ${hasUnitCosts ? `<th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;">Total</th>` : ""}
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
            ${
              hasUnitCosts
                ? `<tfoot>
              <tr style="background:#f8f9fa;">
                <td colspan="2" style="padding:10px 12px;font-size:13px;color:#555;font-weight:600;">Total</td>
                <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:700;">${totalQty} units</td>
                <td style="padding:10px 12px;"></td>
                <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:700;color:#1a2332;">$${totalValue.toFixed(2)}</td>
              </tr>
            </tfoot>`
                : `<tfoot>
              <tr style="background:#f8f9fa;">
                <td colspan="2" style="padding:10px 12px;font-size:13px;color:#555;font-weight:600;">Total</td>
                <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:700;">${totalQty} units</td>
              </tr>
            </tfoot>`
            }
          </table>

          <p style="margin:24px 0 0;font-size:13px;color:#999;line-height:1.6;">
            Please reply to this email to confirm the order or if you have any questions. Thank you for your partnership.
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#999;">— ${fromName} Team</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
            This is an automated purchase order from WareIQ. Reference: ${poNumber}.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPoEmail(opts: SendPoEmailOptions): Promise<{ id: string }> {
  const resend = getResend();

  const subject = `Purchase Order ${opts.poNumber} from ${opts.fromName ?? "WareIQ"}`;

  const { data, error } = await resend.emails.send({
    from: "WareIQ <onboarding@resend.dev>",
    to: [opts.to],
    subject,
    html: buildPoHtml(opts),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Unknown Resend error");
  }

  return { id: data.id };
}
