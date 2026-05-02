export default function Slide04DatabaseSchema() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 90% 10%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Data Design</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.8vw", color: "#F0EDE8", marginTop: "0.8vh", lineHeight: 1.1 }}>Database Schema</h2>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "1fr 1fr", gap: "1.2vw" }}>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>Product</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              SKU · name
              <br />category
              <br />barcode · UOM
              <br />price
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>Supplier</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              name · contact
              <br />address
              <br />status
              <br />created_at
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>PurchaseOrder</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              supplier_id
              <br />status
              <br />+ POLineItem
              <br />sku · qty · price
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>GoodsReceipt</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              po_id
              <br />received_at
              <br />+ ReceiptLine
              <br />sku · qty · bin
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>Location</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              Warehouse
              <br />  → Zone
              <br />    → Bin
              <br />code · type
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>Inventory</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              sku_id · bin_id
              <br />qty_on_hand
              <br />+ Movement
              <br />type · qty · ts
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>SalesOrder</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              customer
              <br />status
              <br />+ OrderLine
              <br />sku · qty
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>PickingTask</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              order_id
              <br />assigned_to
              <br />+ PickingLine
              <br />bin · sku · qty
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>Shipment</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              order_id
              <br />tracking_no
              <br />shipped_at
              <br />carrier
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.6vw", padding: "1.8vh 1.5vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.8vh" }}>User</div>
            <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.55 }}>
              email · name
              <br />password_hash
              <br />role
              <br />Admin / Operator
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
