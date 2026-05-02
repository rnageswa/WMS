import { useEffect } from "react";
import { useParams } from "wouter";
import { useGetPurchaseOrderGrn } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { Printer, ArrowLeft, Loader2, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";

const EVENT_LABELS: Record<string, string> = {
  received: "Fully Received",
  partially_received: "Partially Received",
};

export default function PurchaseOrderGrnPage() {
  const { id } = useParams<{ id: string }>();
  const { data: grn, isLoading } = useGetPurchaseOrderGrn(id!);

  const anyReceived = grn ? grn.lines.some((l) => l.qtyReceived > 0) : false;

  // GRN reference: GRN-{PONUMBER}-{YYYYMMDD of last receipt}
  const lastReceiptDate =
    grn && grn.receiptEvents.length > 0
      ? new Date(grn.receiptEvents[grn.receiptEvents.length - 1].createdAt)
      : grn
        ? new Date(grn.createdAt)
        : null;

  const grnNumber = grn
    ? `GRN-${grn.poNumber}-${lastReceiptDate ? format(lastReceiptDate, "yyyyMMdd") : "NA"}`
    : "";

  // Auto-print once data is loaded
  useEffect(() => {
    if (!isLoading && grn) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isLoading, grn]);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          @page { margin: 16mm 18mm; size: A4; }
          .print-page { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
        }
        @media screen {
          body { background: #f1f5f9; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 bg-white border-b border-border px-5 py-3 shadow-sm">
        <Link href={`/purchase-orders/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to PO
          </button>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {grn && (
            <span className="text-xs text-muted-foreground font-mono">{grnNumber}</span>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="no-print flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading receipt data…</span>
        </div>
      )}

      {grn && !anyReceived && (
        <div className="no-print flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <ClipboardCheck className="w-10 h-10 opacity-30" />
          <p className="text-sm">No stock has been received against this PO yet.</p>
          <Link href={`/purchase-orders/${id}`}>
            <button className="text-sm underline text-[#E8622A]">Return to PO</button>
          </Link>
        </div>
      )}

      {grn && anyReceived && (
        <div
          className="print-page mx-auto my-8 max-w-[780px] bg-white shadow-xl border border-border/40 rounded-lg overflow-hidden px-12 py-10"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="text-2xl font-bold tracking-tight" style={{ color: "#0f2540" }}>
                <span style={{ color: "#E8622A" }}>Ware</span>IQ
              </div>
              <div className="text-xs mt-1" style={{ color: "#6b7280" }}>
                Warehouse Management System
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: "#0f2540", letterSpacing: "-0.5px" }}
              >
                GOODS RECEIPT NOTE
              </div>
              <div className="text-lg font-mono font-semibold mt-1" style={{ color: "#E8622A" }}>
                {grnNumber}
              </div>
              <div className="text-xs mt-1 font-mono" style={{ color: "#9ca3af" }}>
                Ref: {grn.poNumber}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "2px solid #0f2540", marginBottom: "24px" }} />

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Supplier */}
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "#9ca3af" }}
              >
                Supplier
              </div>
              <div className="text-base font-bold" style={{ color: "#0f2540" }}>
                {grn.supplierName}
              </div>
            </div>

            {/* Document details */}
            <div className="space-y-2">
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "#9ca3af" }}
              >
                Receipt Details
              </div>
              {[
                { label: "GRN Number", value: grnNumber },
                { label: "Purchase Order", value: grn.poNumber },
                {
                  label: "PO Date",
                  value: format(new Date(grn.createdAt), "dd MMMM yyyy"),
                },
                {
                  label: "Expected Delivery",
                  value: grn.expectedDeliveryDate
                    ? format(parseISO(grn.expectedDeliveryDate), "dd MMMM yyyy")
                    : "Not specified",
                },
                {
                  label: "Last Receipt Date",
                  value: lastReceiptDate
                    ? format(lastReceiptDate, "dd MMMM yyyy, HH:mm")
                    : "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>{label}</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lines received table */}
          <div
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: "#9ca3af" }}
          >
            Items Received
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#0f2540", color: "#ffffff" }}>
                {["#", "Product", "SKU", "Ordered", "Received", "Outstanding"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: h === "#" || h === "Product" || h === "SKU" ? "left" : "right",
                      fontWeight: 600,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grn.lines.map((line, idx) => {
                const outstanding = line.qtyOrdered - line.qtyReceived;
                const isEven = idx % 2 === 0;
                return (
                  <tr key={line.id} style={{ background: isEven ? "#f9fafb" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontWeight: 500 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>
                      {line.productName}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      {line.skuCode}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>
                      {line.qtyOrdered}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: line.qtyReceived >= line.qtyOrdered ? "#15803d" : "#d97706",
                      }}
                    >
                      {line.qtyReceived}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: outstanding > 0 ? "#dc2626" : "#9ca3af",
                        fontWeight: outstanding > 0 ? 600 : 400,
                      }}
                    >
                      {outstanding > 0 ? outstanding : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Movements by bin */}
          {grn.movements.length > 0 && (
            <div className="mt-8">
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "#9ca3af" }}
              >
                Bin Putaway Detail
              </div>
              <table
                style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Product", "SKU", "Bin", "Zone", "Warehouse", "Qty", "Time"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 10px",
                          textAlign: h === "Qty" || h === "Time" ? "right" : "left",
                          fontWeight: 600,
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#6b7280",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grn.movements.map((m, idx) => (
                    <tr
                      key={m.id}
                      style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}
                    >
                      <td style={{ padding: "8px 10px", color: "#111827", fontWeight: 500 }}>
                        {m.productName}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          color: "#6b7280",
                        }}
                      >
                        {m.skuCode}
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: "11px", color: "#374151" }}>
                        {m.binCode}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#6b7280" }}>{m.zoneName}</td>
                      <td style={{ padding: "8px 10px", color: "#6b7280" }}>{m.warehouseName}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#15803d" }}>
                        +{m.quantity}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#9ca3af", fontSize: "11px" }}>
                        {format(new Date(m.createdAt), "dd MMM HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Receipt events timeline */}
          {grn.receiptEvents.length > 0 && (
            <div className="mt-8">
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-3"
                style={{ color: "#9ca3af" }}
              >
                Receipt History
              </div>
              <div className="space-y-2">
                {grn.receiptEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3"
                    style={{ fontSize: "12px" }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: ev.event === "received" ? "#15803d" : "#d97706",
                        marginTop: 4,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, color: "#111827" }}>
                        {EVENT_LABELS[ev.event] ?? ev.event}
                      </span>
                      {ev.note && (
                        <span style={{ color: "#6b7280", marginLeft: 6 }}>— {ev.note}</span>
                      )}
                      <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: 1 }}>
                        {format(new Date(ev.createdAt), "dd MMM yyyy, HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature blocks */}
          <div className="grid grid-cols-3 gap-10 mt-10">
            {["Received by", "Checked by", "Authorised by"].map((label) => (
              <div key={label}>
                <div style={{ borderTop: "1px solid #d1d5db", paddingTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>{label}</div>
                  <div style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>
                    Name &amp; Date
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "12px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "#d1d5db" }}>
                Generated by WareIQ · {format(new Date(), "dd MMM yyyy, HH:mm")}
              </span>
              <div style={{ fontSize: "11px", color: "#d1d5db", fontFamily: "monospace", marginTop: "2px" }}>
                {grnNumber}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <QRCodeSVG
                value={grnNumber}
                size={72}
                fgColor="#0f2540"
                bgColor="#ffffff"
                level="M"
              />
              <span style={{ fontSize: "9px", color: "#d1d5db", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Scan to verify
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
