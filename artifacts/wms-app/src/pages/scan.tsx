import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useScanLookup, getScanLookupQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Scan,
  Package,
  Grid3X3,
  AlertTriangle,
  SearchX,
  Keyboard,
  Camera,
  CameraOff,
  FileText,
  ClipboardCheck,
  ExternalLink,
  CheckCircle2,
  History,
  X,
} from "lucide-react";

// ── Camera QR scanner ─────────────────────────────────────────────────────────

function CameraScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "active" | "error" | "unsupported">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const lastScannedRef = useRef<string>("");

  const isBarcodeDetectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    lastScannedRef.current = "";
  }, []);

  const startCamera = useCallback(async () => {
    if (!isBarcodeDetectorSupported) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("active");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"] });

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        if (video.readyState < 2) return;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        try {
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) {
            const value: string = barcodes[0].rawValue;
            if (value && value !== lastScannedRef.current) {
              lastScannedRef.current = value;
              onScan(value);
              // Brief pause before next scan
              setTimeout(() => { lastScannedRef.current = ""; }, 3000);
            }
          }
        } catch {
          // Detection error — ignore
        }
      }, 200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg.includes("Permission") ? "Camera permission denied." : "Could not open camera.");
      setStatus("error");
    }
  }, [isBarcodeDetectorSupported, onScan]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isBarcodeDetectorSupported) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="py-10 text-center space-y-2">
          <CameraOff className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-medium">Camera scanning not available</p>
          <p className="text-xs text-muted-foreground">
            Your browser doesn't support the BarcodeDetector API. Use Chrome or Edge, or type the code into the field above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-72">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ display: status === "active" ? "block" : "none" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay when not active */}
        {status !== "active" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <Camera className="w-10 h-10 opacity-50" />
            {status === "idle" && (
              <p className="text-sm opacity-70">Camera not started</p>
            )}
            {status === "starting" && (
              <p className="text-sm opacity-70 animate-pulse">Starting camera…</p>
            )}
            {status === "error" && (
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}
          </div>
        )}

        {/* Scanning reticle */}
        {status === "active" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-48 h-48 rounded-lg"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                border: "2px solid #E8622A",
              }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {status !== "active" ? (
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <Camera className="w-4 h-4" />
            {status === "starting" ? "Starting…" : "Start Camera"}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium py-2.5 rounded-lg transition-colors border border-border"
          >
            <CameraOff className="w-4 h-4" />
            Stop Camera
          </button>
        )}
      </div>

      {status === "active" && (
        <p className="text-xs text-center text-muted-foreground">
          Point camera at a QR code on a printed PO, GRN, bin label, or product.
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:              { bg: "bg-gray-100",   text: "text-gray-600" },
  ordered:            { bg: "bg-blue-50",    text: "text-blue-700" },
  partially_received: { bg: "bg-amber-50",   text: "text-amber-700" },
  received:           { bg: "bg-green-50",   text: "text-green-700" },
  cancelled:          { bg: "bg-red-50",     text: "text-red-600" },
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", ordered: "Ordered",
  partially_received: "Partially Received", received: "Received", cancelled: "Cancelled",
};

interface ScanHistoryItem {
  query: string;
  timestamp: Date;
  matchType: string;
}

export default function ScanPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const [tab, setTab] = useState<"keyboard" | "camera">("keyboard");
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMatchTypeRef = useRef<string>("");

  // Audio feedback on successful scan
  useEffect(() => {
    if (!data || !committed) return;
    if (data.matchType === lastMatchTypeRef.current && committed === scanHistory[0]?.query) return;
    lastMatchTypeRef.current = data.matchType;

    // Play short beep
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = data.matchType === "none" ? 300 : 800;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not available — ignore
    }

    // Add to history (keep last 10)
    setScanHistory((prev) => {
      const item: ScanHistoryItem = { query: committed, timestamp: new Date(), matchType: data.matchType };
      const filtered = prev.filter((p) => p.query !== committed);
      return [item, ...filtered].slice(0, 10);
    });
  }, [data, committed]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        setTab("keyboard");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data, isLoading, isFetching } = useScanLookup(
    { q: committed },
    {
      query: {
        enabled: committed.length > 0,
        queryKey: getScanLookupQueryKey({ q: committed }),
      },
    }
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      setCommitted(query.trim());
    }
  };

  const handleCameraScan = useCallback((value: string) => {
    setQuery(value);
    setCommitted(value);
  }, []);

  // Auto-navigate for PO and GRN matches
  useEffect(() => {
    if (!data) return;
    if (data.matchType === "purchase_order" && (data as any).purchaseOrder?.poId) {
      const tid = setTimeout(() => {
        navigate(`/purchase-orders/${(data as any).purchaseOrder.poId}`);
      }, 1800);
      return () => clearTimeout(tid);
    }
    if (data.matchType === "grn" && (data as any).purchaseOrder?.poId) {
      const tid = setTimeout(() => {
        navigate(`/purchase-orders/${(data as any).purchaseOrder.poId}/grn`);
      }, 1800);
      return () => clearTimeout(tid);
    }
    return undefined;
  }, [data, navigate]);

  const totalQty =
    data?.matchType === "product"
      ? data.inventory.reduce((s, i) => s + i.qtyOnHand, 0)
      : data?.matchType === "bin"
      ? data.bins.flatMap((b) => b.inventory).reduce((s, i) => s + i.qtyOnHand, 0)
      : 0;

  const isLow =
    data?.matchType === "product" &&
    data.product &&
    totalQty <= data.product.reorderThreshold;

  const po = (data as any)?.purchaseOrder as {
    poId: string; poNumber: string; supplierName: string; status: string; supplierId?: string | null;
  } | undefined;

  const statusStyle = po ? (STATUS_COLORS[po.status] ?? STATUS_COLORS.draft) : null;

  return (
    <Layout>
      <PageHeader
        title="Scan Lookup"
        subtitle="Resolve a bin code, SKU, barcode, PO number, or GRN reference"
      />

      <div className="p-6 max-w-3xl space-y-5">

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(["keyboard", "camera"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                tab === t
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "keyboard" ? <Keyboard className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              {t === "keyboard" ? "Type / Scan" : "Camera"}
            </button>
          ))}
        </div>

        {/* Keyboard / scanner input */}
        {tab === "keyboard" && (
          <div className="space-y-2">
            <div className="relative">
              <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Bin code, SKU, barcode, PO number, GRN ref — press Enter"
                className="pl-11 pr-24 h-12 text-base font-mono"
                data-testid="input-scan"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Keyboard className="w-2.5 h-2.5" />
                  Enter
                </kbd>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Press{" "}
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px]">/</kbd>{" "}
              anywhere to focus. Works with handheld barcode and QR scanners.
            </p>
          </div>
        )}

        {/* Camera tab */}
        {tab === "camera" && (
          <CameraScanner onScan={handleCameraScan} />
        )}

        {/* Current query pill */}
        {committed && tab === "camera" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Last scanned:</span>
            <code className="px-2 py-0.5 rounded bg-muted font-mono text-foreground">{committed}</code>
            <button className="underline" onClick={() => { setQuery(""); setCommitted(""); }}>
              Clear
            </button>
          </div>
        )}

        {/* Scan history */}
        {scanHistory.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Recent Scans
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setScanHistory([])}>
                <X className="w-3 h-3" />
                Clear
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-3">
              <div className="flex flex-wrap gap-2">
                {scanHistory.map((item) => (
                  <button
                    key={item.query + item.timestamp.getTime()}
                    onClick={() => { setQuery(item.query); setCommitted(item.query); }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted text-xs font-mono transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.matchType === "none" ? "bg-red-400" :
                      item.matchType === "product" ? "bg-blue-400" :
                      item.matchType === "bin" ? "bg-purple-400" :
                      "bg-green-400"
                    }`} />
                    {item.query}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}

        {(isLoading || isFetching) && committed && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {/* Purchase Order match */}
        {(data?.matchType === "purchase_order" || data?.matchType === "grn") && po && !isFetching && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  {data.matchType === "grn"
                    ? <ClipboardCheck className="w-4.5 h-4.5 text-green-700" />
                    : <FileText className="w-4.5 h-4.5 text-green-700" />
                  }
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {data.matchType === "grn" ? "Goods Receipt Note" : "Purchase Order"}
                  </CardTitle>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{po.poNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle?.bg} ${statusStyle?.text}`}>
                  {STATUS_LABELS[po.status] ?? po.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Supplier:</span> {po.supplierName}
              </div>

              {data.matchType === "grn" && (data as any).grnRef && (
                <div className="text-xs font-mono text-muted-foreground">
                  GRN Ref: {(data as any).grnRef}
                </div>
              )}

              {/* Auto-navigate indicator */}
              <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Redirecting automatically…
              </div>

              <div className="flex gap-2 pt-1">
                <Link href={`/purchase-orders/${po.poId}`}>
                  <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white border border-border hover:bg-muted transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                    View PO
                  </button>
                </Link>
                {data.matchType === "grn" && (
                  <Link href={`/purchase-orders/${po.poId}/grn`}>
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-green-700 text-white hover:bg-green-800 transition-colors">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      View GRN
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </button>
                  </Link>
                )}
                {data.matchType === "purchase_order" && (
                  <Link href={`/purchase-orders/${po.poId}`}>
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-[#E8622A] text-white hover:bg-[#E8622A]/90 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open PO
                    </button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No match */}
        {data?.matchType === "none" && !isFetching && (
          <Card className="border-border/60">
            <CardContent className="py-12 text-center">
              <SearchX className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No match found</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-mono">{data.query}</span> did not match any bin, SKU, barcode, or PO number.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Product match */}
        {data?.matchType === "product" && data.product && !isFetching && (
          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{data.product.name}</CardTitle>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{data.product.skuCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold tabular-nums text-foreground">{totalQty}</p>
                  <p className="text-xs text-muted-foreground">total on hand</p>
                  {isLow && (
                    <div className="flex items-center gap-1 justify-end mt-1 text-amber-600 text-[11px] font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Below reorder ({data.product.reorderThreshold})
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{data.product.category ?? "—"}</span>
                  <span>·</span>
                  <span>{data.product.unitOfMeasure}</span>
                  {data.product.unitPrice && (
                    <><span>·</span><span>${data.product.unitPrice}</span></>
                  )}
                  <span>·</span>
                  <Link href={`/products/${data.product.id}`} className="text-primary hover:underline">
                    View product
                  </Link>
                </div>
              </CardContent>
            </Card>

            {data.inventory.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Inventory Positions</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Warehouse</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Zone</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Bin</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.inventory.map((item) => (
                        <TableRow key={item.id} data-testid={`scan-inv-${item.id}`}>
                          <TableCell className="text-sm">{(item as any).bin?.zone?.warehouse?.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(item as any).bin?.zone?.name}</TableCell>
                          <TableCell className="font-mono text-xs">{(item as any).bin?.code}</TableCell>
                          <TableCell className="text-right font-bold tabular-nums">{item.qtyOnHand}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            {data.inventory.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">
                No inventory positions for this product.
              </p>
            )}
          </div>
        )}

        {/* Bin match */}
        {data?.matchType === "bin" && data.bins.length > 0 && !isFetching && (
          <div className="space-y-4">
            {data.bins.map((bin) => (
              <Card key={bin.id} className="border-border/60">
                <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center gap-2.5 space-y-0">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Grid3X3 className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold font-mono">{bin.code}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(bin as any).zone?.warehouse?.name} &rsaquo; {(bin as any).zone?.name}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold tabular-nums">
                      {bin.inventory.reduce((s, i) => s + i.qtyOnHand, 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">total units</p>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pb-1">
                  {bin.inventory.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">Bin is empty</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">SKU</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Alert</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bin.inventory.map((item) => {
                          const low = item.qtyOnHand <= (item.product as any).reorderThreshold;
                          return (
                            <TableRow key={item.id} data-testid={`scan-bin-inv-${item.id}`}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {(item as any).product?.skuCode}
                              </TableCell>
                              <TableCell className="text-sm">
                                <Link href={`/products/${(item as any).product?.id}`} className="hover:underline font-medium">
                                  {(item as any).product?.name}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right font-bold tabular-nums">{item.qtyOnHand}</TableCell>
                              <TableCell>
                                {low && (
                                  <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                                    Low
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!committed && (
          <div className="text-center py-10 text-muted-foreground">
            <Scan className="w-12 h-12 mx-auto opacity-20 mb-4" />
            <p className="text-sm font-medium mb-1">Ready to scan</p>
            <p className="text-xs opacity-70 max-w-sm mx-auto">
              Type or scan a bin code, SKU, product barcode, PO number (e.g. <span className="font-mono">PO-26-0001</span>), or GRN reference.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
