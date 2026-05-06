import { useEffect } from "react";
import { useParams } from "wouter";
import { useGetSalesOrder } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Printer, ArrowLeft, Loader2, PackageCheck } from "lucide-react";
import { Link } from "wouter";

export default function SalesOrderPackingSlipPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useGetSalesOrder({ pathParams: { id: id! } });

  const lines = (order as any)?.lines || [];
  const packingSlipNumber = `PS-${(order as any)?.orderNumber || ""}`;

  const totalItems = lines.reduce((sum: number, l: any) => sum + (l.qtyPacked || l.qtyPicked || 0), 0);
  const totalValue = lines.reduce((sum: number, l: any) => {
    const qty = l.qtyPacked || l.qtyPicked || 0;
    const price = parseFloat(l.unitPrice || "0") || 0;
    return sum + (qty * price);
  }, 0);

  // Auto-print once data is loaded
  useEffect(() => {
    if (!isLoading && order) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isLoading, order]);

  return (
    <>
      {/* ── Print-only styles ─────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          @page { margin: 16mm 18mm; size: A4; }
          .print-page { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
        }
        @media screen {
          body { background: #f1f5f9; }
        }
      `}</style>

      {/* ── Screen-only toolbar ───────────────────────────────────── */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 bg-white border-b border-border px-5 py-3 shadow-sm">
        <Link href={`/sales-orders/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Order
          </button>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {order && (
            <span className="text-xs text-muted-foreground font-mono">
              {(order as any).orderNumber}
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

      {/* ── Loading state ─────────────────────────────────────── */}
      {isLoading && (
        <div className="no-print flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading packing slip…</span>
        </div>
      )}

      {/* ── Document ────────────────────────────────────────── */}
      {order && (
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
                PACKING SLIP
              </div>
              <div className="text-lg font-mono font-semibold mt-1" style={{ color: "#E8622A" }}>
                {(order as any).orderNumber}
              </div>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide" style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                Packed
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "2px solid #0f2540", marginBottom: "24px" }} />

          {/* Info grid — Ship To | Order Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Ship To */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                Ship To
              </div>
              <div className="text-base font-bold" style={{ color: "#0f2540" }}>
                {(order as any).customerName}
              </div>
              {(order as any).customerEmail && (
                <div className="mt-1 text-sm" style={{ color: "#6b7280" }}>{(order as any).customerEmail}</div>
              )}
              {(order as any).customerPhone && (
                <div className="text-sm" style={{ color: "#6b7280" }}>{(order as any).customerPhone}</div>
              )}
              {(order as any).shippingAddress && (
                <div className="mt-1 text-xs whitespace-pre-line" style={{ color: "#6b7280" }}>
                  {(order as any).shippingAddress}
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                Order Details
              </div>
              {[
                { label: "Slip Number", value: packingSlipNumber },
                { label: "Order Date", value: format(new Date((order as any).createdAt), "dd MMMM yyyy") },
                { label: "Status", value: "Packed" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>{label}</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Packed Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#0f2540", color: "#ffffff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>#</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>SKU</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Product</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Qty</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Unit Price</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any, idx: number) => {
                const qty = line.qtyPacked || line.qtyPicked || 0;
                const price = parseFloat(line.unitPrice || "0") || 0;
                const lineTotal = qty * price;
                const isEven = idx % 2 === 0;
                return (
                  <tr key={line.id} style={{ background: isEven ? "#f9fafb" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: "#6b7280" }}>{line.skuCode || "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>{line.productName || line.productId}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#111827" }}>{qty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>
                      {price > 0 ? `$${price.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#111827" }}>
                      {price > 0 ? `$${lineTotal.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                <td colSpan={4} style={{ padding: "12px 12px", textAlign: "right", fontSize: "13px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Items
                </td>
                <td style={{ padding: "12px 12px", textAlign: "right", fontSize: "16px", fontWeight: 700, color: "#0f2540" }}>
                  {totalItems} units
                </td>
              </tr>
              <tr>
                <td colSpan={4} style={{ padding: "4px 12px", textAlign: "right", fontSize: "13px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Value
                </td>
                <td style={{ padding: "4px 12px", textAlign: "right", fontSize: "16px", fontWeight: 700, color: "#0f2540" }}>
                  ${totalValue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#d1d5db" }}>
                Generated by WareIQ · {format(new Date(), "dd MMM yyyy, HH:mm")}
              </span>
              <div style={{ fontSize: "11px", color: "#d1d5db", fontFamily: "monospace", marginTop: "2px" }}>
                {(order as any).orderNumber}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
