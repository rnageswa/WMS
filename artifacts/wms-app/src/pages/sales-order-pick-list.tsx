import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useGetSalesOrder } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Printer, ArrowLeft, Loader2, Package, CheckCircle, Barcode } from "lucide-react";
import { Link } from "wouter";
import LabelPrint from "@/components/label-print";
import { LabelData } from "@/components/label-print";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  picking: "bg-amber-100 text-amber-700",
  picked: "bg-blue-100 text-blue-700",
  packed: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
};

export default function SalesOrderPickListPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useGetSalesOrder({ pathParams: { id: id! } });

  const lines = (order as any)?.lines || [];

  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const labelData: LabelData[] = lines.map((l: any) => ({
    productId: l.productId,
    skuCode: l.skuCode || "",
    productName: l.productName || "",
  }));

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
          .print-page { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
        }
        @media screen {
          body { background: #f1f5f9; }
        }
      `}</style>

      {/* ── Screen-only toolbar ─────────────────────────────────────── */}
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
            Print Pick List
          </button>
          <button
            onClick={() => setLabelPrintOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <Barcode className="w-4 h-4" />
            Print SKU Labels
          </button>
        </div>
      </div>

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {isLoading && (
        <div className="no-print flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading pick list…</span>
        </div>
      )}

      {/* ── Document ────────────────────────────────────────────────── */}
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
                PICK LIST
              </div>
              <div className="text-lg font-mono font-semibold mt-1" style={{ color: "#E8622A" }}>
                {(order as any).orderNumber}
              </div>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide" style={{ background: "#fef3c7", color: "#92400e" }}>
                {(order as any).status}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "2px solid #0f2540", marginBottom: "24px" }} />

          {/* Info grid — Customer | Order Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Customer */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                Customer
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
                { label: "Order Number", value: (order as any).orderNumber },
                { label: "Date Created", value: format(new Date((order as any).createdAt), "dd MMMM yyyy") },
                { label: "Expected Ship", value: (order as any).expectedShipDate ? format(new Date((order as any).expectedShipDate), "dd MMMM yyyy") : "Not specified" },
                { label: "Status", value: (order as any).status },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>{label}</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pick List Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#0f2540", color: "#ffffff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>#</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>SKU</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Product</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ordered</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Picked</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Location</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any, idx: number) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr key={line.id} style={{ background: isEven ? "#f9fafb" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: "#6b7280" }}>{line.skuCode || "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>{line.productName || line.productId}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#111827" }}>{line.qtyOrdered}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: line.qtyPicked > 0 ? "#15803d" : "#9ca3af" }}>
                      {line.qtyPicked !== undefined ? line.qtyPicked : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "11px", color: "#6b7280" }}>
                      {line.binCode ? `${line.binCode}${line.binName ? ` (${line.binName})` : ""}` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: 600,
                        background: line.status === "picked" ? "#dcfce7" : line.status === "picking" ? "#fef3c7" : "#f3f4f6",
                        color: line.status === "picked" ? "#15803d" : line.status === "picking" ? "#92400e" : "#374151",
                      }}>
                        {line.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>{lines.length}</div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>Total Lines</div>
            </div>
            <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>
                {lines.reduce((sum: number, l: any) => sum + (l.qtyOrdered || 0), 0)}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>Items Ordered</div>
            </div>
            <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#15803d" }}>
                {lines.reduce((sum: number, l: any) => sum + (l.qtyPicked || 0), 0)}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>Items Picked</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#d1d5db" }}>
                Generated by WareIQ · {format(new Date(), "dd MMMM yyyy, HH:mm")}
              </span>
              <div style={{ fontSize: "11px", color: "#d1d5db", fontFamily: "monospace", marginTop: "2px" }}>
                {(order as any).orderNumber}
              </div>
            </div>
          </div>
        </div>
      )}

      <LabelPrint
        open={labelPrintOpen}
        onClose={() => setLabelPrintOpen(false)}
        labels={labelData}
      />
    </>
  );
}
