import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Tag } from "lucide-react";

export interface LabelData {
  productId: string;
  skuCode: string;
  productName: string;
  category?: string | null;
  unitOfMeasure?: string | null;
}

interface LabelPrintProps {
  open: boolean;
  onClose: () => void;
  label: LabelData;
}

function ProductLabel({ label }: { label: LabelData }) {
  return (
    <div
      className="label-card"
      style={{
        width: "340px",
        height: "170px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, lineHeight: "1.3", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label.productName}
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "2px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {label.category && <span>{label.category}</span>}
            {label.unitOfMeasure && <span>· {label.unitOfMeasure}</span>}
          </div>
        </div>
        {/* QR Code */}
        <div style={{ marginLeft: "10px", flexShrink: 0 }}>
          <QRCodeSVG value={label.skuCode} size={54} level="M" />
        </div>
      </div>

      {/* Barcode */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "6px" }}>
        <Barcode
          value={label.skuCode}
          width={1.4}
          height={36}
          fontSize={9}
          margin={0}
          displayValue={true}
          background="transparent"
          lineColor="#000"
        />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
        <span style={{ fontSize: "8px", color: "#aaa", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          WareIQ
        </span>
        <span style={{ fontSize: "8px", color: "#bbb", fontFamily: "monospace" }}>
          {label.productId.slice(0, 8).toUpperCase()}
        </span>
      </div>
    </div>
  );
}

const LABEL_SIZES = [
  { id: "100x50", label: '100×50mm (4"×2" shipping)', width: 378, height: 189 },
  { id: "90x30", label: '90×30mm (shelf edge)', width: 340, height: 113 },
  { id: "62x29", label: '62×29mm (small tag)', width: 234, height: 110 },
];

export default function LabelPrint({ open, onClose, label }: LabelPrintProps) {
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState("100x50");
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      alert("Pop-up blocked. Please allow pop-ups for this site to print labels.");
      return;
    }

    const labelHtml = previewRef.current?.innerHTML ?? "";

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Labels — ${label.skuCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
      padding: 8mm;
    }
    .labels-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4mm;
      align-items: flex-start;
    }
    .label-card {
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #999 !important;
    }
    @page {
      size: A4;
      margin: 10mm;
    }
    @media print {
      body { padding: 0; }
      .labels-grid { gap: 3mm; }
    }
  </style>
</head>
<body>
  <div class="labels-grid">
    ${Array(copies).fill(labelHtml).join("\n")}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); window.close(); }, 400);
    });
  </script>
</body>
</html>`);
    printWin.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            Print Product Labels
          </DialogTitle>
        </DialogHeader>

        <div className="py-1 space-y-5">
          {/* Options row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Copies</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="h-8 text-sm w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label size</Label>
              <Select value={labelSize} onValueChange={setLabelSize}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_SIZES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Label preview */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Preview</p>
            <div className="bg-muted/30 rounded-lg border border-border/50 p-5 flex items-center justify-center overflow-hidden">
              <div ref={previewRef} style={{ transform: "scale(0.95)", transformOrigin: "center" }}>
                <ProductLabel label={label} />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-2 rounded-md border border-border/30">
            <strong>{copies}</strong> label{copies !== 1 ? "s" : ""} will be sent to your printer. The QR code and barcode both encode the SKU <span className="font-mono">{label.skuCode}</span> for scanning.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handlePrint}
            className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
          >
            <Printer className="w-3.5 h-3.5" />
            Print {copies} Label{copies !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
