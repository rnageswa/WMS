import { useEffect } from "react";
import { useParams } from "wouter";
import {
  useGetPurchaseOrder,
  useGetSupplier,
  getGetSupplierQueryKey,
} from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency, getCurrencySymbol } from "@/lib/utils";

type PoLine = {
  id: string;
  productId: string;
  skuCode: string;
  productName: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: string | null;
  status: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

function fmt(n: number, currency: string = "USD") {
  return formatCurrency(n, currency);
}

export default function PurchaseOrderPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { data: po, isLoading } = useGetPurchaseOrder(id!);
  const supplierId = (po as any)?.supplierId as string | null | undefined;
  const { data: supplier } = useGetSupplier(supplierId ?? "skip", {
    query: {
      queryKey: getGetSupplierQueryKey(supplierId ?? "skip"),
      enabled: !!supplierId,
    },
  });

  const poLines: PoLine[] = (po as any)?.lines ?? [];

  const subtotal = poLines.reduce((sum, l) => {
    if (!l.unitCost) return sum;
    return sum + parseFloat(l.unitCost) * l.qtyOrdered;
  }, 0);

  const hasUnitCosts = poLines.some((l) => l.unitCost !== null);

  // Auto-print once data is loaded
  useEffect(() => {
    if (!isLoading && po) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isLoading, po]);

  return (
    <>
      {/* ── Print-only styles injected into <head> via a style tag ─────────── */}
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

      {/* ── Screen-only toolbar ─────────────────────────────────────────────── */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 bg-white border-b border-border px-5 py-3 shadow-sm">
        <Link href={`/purchase-orders/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to PO
          </button>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {po && (
            <span className="text-xs text-muted-foreground font-mono">
              {(po as any).poNumber}
            </span>
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

      {/* ── Loading state ───────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="no-print flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading purchase order…</span>
        </div>
      )}

      {/* ── Document ────────────────────────────────────────────────────────── */}
      {po && (
        <div className="print-page mx-auto my-8 max-w-[780px] bg-white shadow-xl border border-border/40 rounded-lg overflow-hidden px-12 py-10" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="text-2xl font-bold tracking-tight" style={{ color: "#0f2540" }}>
                <span style={{ color: "#E8622A" }}>Ware</span>IQ
              </div>
              <div className="text-xs mt-1" style={{ color: "#6b7280" }}>Warehouse Management System</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: "#0f2540", letterSpacing: "-0.5px" }}>
                PURCHASE ORDER
              </div>
              <div className="text-lg font-mono font-semibold mt-1" style={{ color: "#E8622A" }}>
                {(po as any).poNumber}
              </div>
              <div
                className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
                style={{
                  background:
                    po.status === "received" ? "#dcfce7" :
                    po.status === "ordered" ? "#dbeafe" :
                    po.status === "partially_received" ? "#fef3c7" :
                    po.status === "cancelled" ? "#fee2e2" :
                    "#f3f4f6",
                  color:
                    po.status === "received" ? "#15803d" :
                    po.status === "ordered" ? "#1d4ed8" :
                    po.status === "partially_received" ? "#d97706" :
                    po.status === "cancelled" ? "#dc2626" :
                    "#4b5563",
                }}
              >
                {STATUS_LABELS[po.status] ?? po.status}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "2px solid #0f2540", marginBottom: "24px" }} />

          {/* Info grid — Supplier | Order Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Supplier */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                Supplier
              </div>
              <div className="text-base font-bold" style={{ color: "#0f2540" }}>
                {(po as any).supplierName ?? "—"}
              </div>
              {supplier && (
                <div className="mt-1 space-y-0.5 text-sm" style={{ color: "#374151" }}>
                  {(supplier as any).contactName && (
                    <div>{(supplier as any).contactName}</div>
                  )}
                  {(supplier as any).email && (
                    <div style={{ color: "#6b7280" }}>{(supplier as any).email}</div>
                  )}
                  {(supplier as any).phone && (
                    <div style={{ color: "#6b7280" }}>{(supplier as any).phone}</div>
                  )}
                  {(supplier as any).address && (
                    <div className="mt-1 text-xs whitespace-pre-line" style={{ color: "#6b7280" }}>
                      {(supplier as any).address}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PO details */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                Order Details
              </div>
              {[
                { label: "PO Number", value: (po as any).poNumber },
                {
                  label: "Date Created",
                  value: format(new Date(po.createdAt), "dd MMMM yyyy"),
                },
                {
                  label: "Expected Delivery",
                  value: po.expectedDeliveryDate
                    ? format(parseISO(po.expectedDeliveryDate), "dd MMMM yyyy")
                    : "Not specified",
                },
                { label: "Status", value: STATUS_LABELS[po.status] ?? po.status },
                { label: "Currency", value: `${getCurrencySymbol((po as any).currency)} ${(po as any).currency}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>{label}</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line items table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#0f2540", color: "#ffffff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", borderRadius: "0" }}>#</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Product</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>SKU</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ordered</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Received</th>
                {hasUnitCosts && (
                  <>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Unit Cost</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {poLines.map((line, idx) => {
                const lineTotal = line.unitCost ? parseFloat(line.unitCost) * line.qtyOrdered : null;
                const isEven = idx % 2 === 0;
                return (
                  <tr key={line.id} style={{ background: isEven ? "#f9fafb" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>{line.productName}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: "#6b7280" }}>{line.skuCode}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#111827" }}>{line.qtyOrdered}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: line.qtyReceived > 0 ? "#15803d" : "#9ca3af" }}>
                      {line.qtyReceived}
                    </td>
                    {hasUnitCosts && (
                      <>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>
                          {line.unitCost ? fmt(parseFloat(line.unitCost), (po as any).currency) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#111827" }}>
                          {lineTotal !== null ? fmt(lineTotal, (po as any).currency) : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {hasUnitCosts && (
              <tfoot>
                <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={5} style={{ padding: "12px 12px", textAlign: "right", fontSize: "13px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Subtotal
                  </td>
                  <td colSpan={2} style={{ padding: "12px 12px", textAlign: "right", fontSize: "16px", fontWeight: 700, color: "#0f2540" }}>
                    {fmt(subtotal, (po as any).currency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          {/* Notes */}
          {po.notes && (
            <div className="mt-6 p-4 rounded-lg" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>
                Notes
              </div>
              <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>{po.notes}</p>
            </div>
          )}

          {/* Signature blocks */}
          <div className="grid grid-cols-2 gap-12 mt-10">
            {[
              { label: "Authorised by" },
              { label: "Received by" },
            ].map(({ label }) => (
              <div key={label}>
                <div style={{ borderTop: "1px solid #d1d5db", paddingTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>{label}</div>
                  <div style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>Name &amp; Date</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#d1d5db" }}>
                Generated by WareIQ · {format(new Date(), "dd MMM yyyy, HH:mm")}
              </span>
              <div style={{ fontSize: "11px", color: "#d1d5db", fontFamily: "monospace", marginTop: "2px" }}>
                {(po as any).poNumber}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <QRCodeSVG
                value={(po as any).poNumber}
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
