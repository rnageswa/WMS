import { useState, useMemo } from "react";
import {
  useListAllBins,
  useListWarehouses,
  getListAllBinsQueryKey,
  getListWarehousesQueryKey,
} from "@workspace/api-client-react";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "wouter";
import {
  Printer,
  ArrowLeft,
  Tag,
  Loader2,
  CheckSquare,
  Square,
  Grid3X3,
} from "lucide-react";

type BinItem = {
  id: string;
  code: string;
  name?: string | null;
  zone: { id: string; name: string; code: string; warehouse: { id: string; name: string } };
};

const LABEL_SIZES = [
  { id: "avery5160", label: "Avery 5160 / L7160 (30-up, 3×10)", cols: 3, width: "63.5mm", height: "29.6mm", pageMargin: "12mm 9mm" },
  { id: "avery5163", label: "Avery 5163 / L7163 (14-up, 2×7)", cols: 2, width: "99.1mm", height: "38.1mm", pageMargin: "12mm 9mm" },
  { id: "thermal", label: "Thermal / Single column (58mm)", cols: 1, width: "50mm", height: "30mm", pageMargin: "4mm" },
] as const;

type LabelSizeId = typeof LABEL_SIZES[number]["id"];

export default function LocationLabelsPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedBins, setSelectedBins] = useState<Set<string>>(new Set());
  const [labelSize, setLabelSize] = useState<LabelSizeId>("avery5160");
  const [selectMode, setSelectMode] = useState<"all" | "none" | "custom">("all");

  const { data: warehouses } = useListWarehouses({
    query: { queryKey: getListWarehousesQueryKey() },
  });

  const { data: allBins, isLoading } = useListAllBins(
    {
      warehouseId: selectedWarehouse !== "all" ? selectedWarehouse : undefined,
      zoneId: selectedZone !== "all" ? selectedZone : undefined,
    },
    {
      query: {
        queryKey: getListAllBinsQueryKey({
          warehouseId: selectedWarehouse !== "all" ? selectedWarehouse : undefined,
          zoneId: selectedZone !== "all" ? selectedZone : undefined,
        }),
      },
    }
  );

  const bins = (allBins ?? []) as BinItem[];

  const zones = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    bins.forEach((b) => {
      if (!seen.has(b.zone.id)) seen.set(b.zone.id, { id: b.zone.id, name: b.zone.name });
    });
    return Array.from(seen.values());
  }, [bins]);

  const printBins = useMemo(() => {
    if (selectMode === "all") return bins;
    if (selectMode === "none") return [];
    return bins.filter((b) => selectedBins.has(b.id));
  }, [bins, selectMode, selectedBins]);

  const sizeConfig = LABEL_SIZES.find((s) => s.id === labelSize) ?? LABEL_SIZES[0];

  const toggleBin = (id: string) => {
    setSelectMode("custom");
    setSelectedBins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectMode("all");
    setSelectedBins(new Set());
  };

  const selectNone = () => {
    setSelectMode("none");
    setSelectedBins(new Set());
  };

  const isBinSelected = (id: string) =>
    selectMode === "all" || (selectMode === "custom" && selectedBins.has(id));

  return (
    <>
      {/* ── Print styles ───────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          @page {
            margin: ${sizeConfig.pageMargin};
            size: A4;
          }
          .label-grid {
            display: grid !important;
            grid-template-columns: repeat(${sizeConfig.cols}, 1fr) !important;
            gap: 0 !important;
            width: 100% !important;
          }
          .label-cell {
            width: ${sizeConfig.width} !important;
            height: ${sizeConfig.height} !important;
            border: 0.5px dashed #bbb !important;
            box-sizing: border-box !important;
            padding: 3px 4px !important;
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
          }
          .label-qr { flex-shrink: 0 !important; }
          .label-text { overflow: hidden !important; flex: 1 !important; }
          .label-code { font-size: 13px !important; font-weight: 700 !important; font-family: monospace !important; line-height: 1.1 !important; white-space: nowrap !important; overflow: hidden !important; }
          .label-location { font-size: 8px !important; color: #555 !important; white-space: nowrap !important; overflow: hidden !important; margin-top: 2px !important; }
          .label-warehouse { font-size: 7.5px !important; color: #888 !important; white-space: nowrap !important; overflow: hidden !important; margin-top: 1px !important; }
        }
        @media screen {
          body { background: #f1f5f9; }
          .label-grid { display: grid; grid-template-columns: repeat(${sizeConfig.cols === 1 ? 2 : sizeConfig.cols}, minmax(0,1fr)); gap: 0; }
        }
      `}</style>

      {/* ── Screen toolbar ──────────────────────────────────────────────────── */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-border shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3">
          <Link href="/locations">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Locations
            </button>
          </Link>

          <div className="h-4 w-px bg-border" />

          {/* Warehouse filter */}
          <select
            className="text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={selectedWarehouse}
            onChange={(e) => { setSelectedWarehouse(e.target.value); setSelectedZone("all"); setSelectMode("all"); }}
          >
            <option value="all">All warehouses</option>
            {(warehouses ?? []).map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Zone filter */}
          <select
            className="text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={selectedZone}
            onChange={(e) => { setSelectedZone(e.target.value); setSelectMode("all"); }}
          >
            <option value="all">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          {/* Label size */}
          <select
            className="text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value as LabelSizeId)}
          >
            {LABEL_SIZES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            {/* Select controls */}
            <button
              onClick={selectAll}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckSquare className="w-3.5 h-3.5" /> All
            </button>
            <button
              onClick={selectNone}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Square className="w-3.5 h-3.5" /> None
            </button>

            <div className="h-4 w-px bg-border" />

            {/* Label count */}
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{printBins.length}</span> label{printBins.length !== 1 ? "s" : ""}
            </span>

            <button
              onClick={() => window.print()}
              disabled={printBins.length === 0}
              className="flex items-center gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Labels
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <div className="px-5 pb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Tag className="w-3 h-3" />
          Click any label to toggle selection · QR code encodes the bin code for scanner lookup
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="no-print flex items-center justify-center py-32 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading bins…</span>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!isLoading && bins.length === 0 && (
        <div className="no-print flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <Grid3X3 className="w-10 h-10 opacity-20" />
          <p className="text-sm">No bins found for the selected filters.</p>
          <Link href="/locations">
            <button className="text-sm text-[#E8622A] underline">Go to Locations to create bins</button>
          </Link>
        </div>
      )}

      {/* ── Label grid ─────────────────────────────────────────────────────── */}
      {!isLoading && bins.length > 0 && (
        <div className="p-4 no-print" />
      )}

      {!isLoading && bins.length > 0 && (
        <div className="label-grid mx-auto" style={{ maxWidth: "900px" }}>
          {/* Screen: show all bins, toggle selection; Print: show only selected */}
          {bins.map((bin) => {
            const selected = isBinSelected(bin.id);
            const willPrint = printBins.some((b) => b.id === bin.id);

            return (
              <div
                key={bin.id}
                onClick={() => toggleBin(bin.id)}
                className={`label-cell cursor-pointer select-none transition-all ${
                  willPrint
                    ? "bg-white border border-dashed border-gray-300"
                    : "no-print bg-gray-50 border border-dashed border-gray-200 opacity-40"
                }`}
                style={{
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minHeight: "72px",
                }}
              >
                {/* QR code */}
                <div className="label-qr flex-shrink-0">
                  <QRCodeSVG
                    value={bin.code}
                    size={labelSize === "thermal" ? 40 : labelSize === "avery5163" ? 52 : 44}
                    fgColor="#0f2540"
                    bgColor="transparent"
                    level="M"
                  />
                </div>

                {/* Text */}
                <div className="label-text overflow-hidden flex-1 min-w-0">
                  <div
                    className="label-code font-mono font-bold truncate"
                    style={{ fontSize: labelSize === "thermal" ? "11px" : "14px", color: "#0f2540", lineHeight: 1.15 }}
                  >
                    {bin.code}
                  </div>
                  {bin.name && (
                    <div
                      className="label-location truncate"
                      style={{ fontSize: "9px", color: "#6b7280", marginTop: "1px" }}
                    >
                      {bin.name}
                    </div>
                  )}
                  <div
                    className="label-location truncate"
                    style={{ fontSize: "9px", color: "#6b7280", marginTop: bin.name ? "0px" : "2px" }}
                  >
                    {bin.zone.code} · {bin.zone.name}
                  </div>
                  <div
                    className="label-warehouse truncate"
                    style={{ fontSize: "8.5px", color: "#9ca3af", marginTop: "1px" }}
                  >
                    {bin.zone.warehouse.name}
                  </div>
                </div>

                {/* Screen-only: selected indicator */}
                <div className={`no-print flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${selected ? "bg-[#E8622A]" : "border border-border"}`}>
                  {selected && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}

          {/* Print-only: only the selected bins */}
          {/* We render print-only clones of selected bins in a separate section for clean print output */}
        </div>
      )}

      {/* Print-only label sheet — clean output without screen chrome */}
      {!isLoading && printBins.length > 0 && (
        <div className="hidden" style={{ display: "none" }}>
          <style>{`
            @media print {
              .print-label-sheet { display: block !important; }
              .label-grid { display: none !important; }
              .no-print { display: none !important; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
