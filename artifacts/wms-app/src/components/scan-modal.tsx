import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Camera, CameraOff, RotateCcw, Zap } from "lucide-react";

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  title?: string;
}

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
      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"],
      });

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
    return () => { stopCamera(); };
  }, [stopCamera]);

  if (!isBarcodeDetectorSupported) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <CameraOff className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">Camera scanning not available</p>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          Your browser doesn't support the BarcodeDetector API. Use Chrome or Edge on a device with a camera.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Viewfinder */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ display: status === "active" ? "block" : "none" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay when not scanning */}
        {status !== "active" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/60">
            {status === "idle" && (
              <>
                <Camera className="w-12 h-12 opacity-40" />
                <p className="text-sm opacity-60">Camera not started</p>
              </>
            )}
            {status === "starting" && (
              <p className="text-sm opacity-70 animate-pulse">Starting camera…</p>
            )}
            {status === "error" && (
              <p className="text-sm text-red-400 px-4 text-center">{errorMsg}</p>
            )}
          </div>
        )}

        {/* Scanning reticle */}
        {status === "active" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-56 h-40 rounded-lg"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                border: "2px solid #E8622A",
              }}
            >
              {/* Corner markers */}
              <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-[#E8622A] rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-[#E8622A] rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-[#E8622A] rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-[#E8622A] rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Status badge */}
        {status === "active" && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-white font-medium">Scanning…</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {status !== "active" ? (
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            <Camera className="w-4 h-4" />
            {status === "starting" ? "Starting…" : "Start Camera"}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium py-3 rounded-xl transition-colors border border-border"
          >
            <CameraOff className="w-4 h-4" />
            Stop Camera
          </button>
        )}
        {status === "error" && (
          <button
            onClick={startCamera}
            className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium py-3 px-4 rounded-xl transition-colors border border-border"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {status === "active" && (
        <p className="text-[11px] text-center text-muted-foreground">
          Point camera at barcode or QR code. Detection is automatic.
        </p>
      )}
    </div>
  );
}

export function ScanModal({ open, onClose, onScan, title = "Scan Barcode" }: ScanModalProps) {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);

  const handleScan = useCallback((value: string) => {
    setLastScanned(value);
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 600);
    onScan(value);
  }, [onScan]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (open) setLastScanned(null);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div
        className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8622A]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#E8622A]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-[10px] text-muted-foreground">Camera barcode scanner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scanner body */}
        <div className="p-5">
          <CameraScanner onScan={handleScan} />

          {/* Last scanned result */}
          {lastScanned && (
            <div className={`mt-4 p-3 rounded-xl border text-center transition-all ${
              flashSuccess
                ? "bg-green-50 border-green-200 scale-[1.02]"
                : "bg-muted/40 border-border"
            }`}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Detected</p>
              <p className="text-sm font-mono font-semibold text-foreground break-all">{lastScanned}</p>
              {flashSuccess && (
                <p className="text-[10px] text-green-600 font-medium mt-1">✓ Scanned successfully</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
