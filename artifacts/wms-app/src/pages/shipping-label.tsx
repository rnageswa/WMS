import { useEffect } from "react";
import { useParams } from "wouter";
import { useGetSalesOrder } from "@workspace/api-client-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Printer, ArrowLeft, Truck, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function ShippingLabelPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useGetSalesOrder({ pathParams: { id: id! } });

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
          @page { margin: 10mm; size: 4in 6in; }
          .label-page { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
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
          <span className="text-sm">Loading shipping label…</span>
        </div>
      )}

      {/* ── Document ────────────────────────────────────────── */}
      {order && (
        <div className="label-page mx-auto my-8 max-w-[4in] bg-white shadow-xl border border-border/40 rounded-lg overflow-hidden px-8 py-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xl font-bold tracking-tight" style={{ color: "#0f2540" }}>
                <span style={{ color: "#E8622A" }}>Ware</span>IQ
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#6b7280" }}>Shipping Label</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-semibold mt-1" style={{ color: "#E8622A" }}>
                {(order as any).orderNumber}
              </div>
              {(order as any).shippedAt && (
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date((order as any).shippedAt), "dd MMM yyyy")}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "2px solid #0f2540", marginBottom: "16px" }} />

          {/* Ship To */}
          <div className="mb-6">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
              Ship To
            </div>
            <div className="text-base font-bold" style={{ color: "#0f2540" }}>
              {(order as any).customerName}
            </div>
            {(order as any).customerPhone && (
              <div className="text-sm mt-1" style={{ color: "#6b7280" }}>{(order as any).customerPhone}</div>
            )}
            {(order as any).shippingAddress && (
              <div className="mt-2 text-sm" style={{ color: "#374151", lineHeight: 1.4 }}>
                {(order as any).shippingAddress.split(",").map((line: string, i: number) => (
                  <div key={i}>{line.trim()}</div>
                ))}
              </div>
            )}
          </div>

          {/* Order Info & Tracking */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>
                Order #
              </div>
              <div className="text-sm font-mono font-semibold" style={{ color: "#111827" }}>
                {(order as any).orderNumber}
              </div>
            </div>
            {(order as any).trackingNumber && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>
                  Tracking #
                </div>
                <div className="text-sm font-mono font-semibold" style={{ color: "#111827" }}>
                  {(order as any).trackingNumber}
                </div>
              </div>
            )}
            {(order as any).carrier && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>
                  Carrier
                </div>
                <div className="text-sm" style={{ color: "#111827" }}>
                  {(order as any).carrier}
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center my-6">
            <QRCodeSVG
              value={(order as any).orderNumber || id!}
              size={80}
              fgColor="#0f2540"
              bgColor="#ffffff"
              level="M"
            />
          </div>

          {/* Footer */}
          <div style={{ marginTop: "20px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div className="text-[10px]" style={{ color: "#d1d5db" }}>
                Generated by WareIQ · {format(new Date(), "dd MMM yyyy")}
              </div>
            </div>
            <Truck className="w-5 h-5" style={{ color: "#E8622A" }} />
          </div>
        </div>
      )}
    </>
  );
}
