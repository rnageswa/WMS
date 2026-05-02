export default function Slide05EntityRelationships() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(232,99,26,0.05) 0%, transparent 70%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "3vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Data Design</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.8vw", color: "#F0EDE8", marginTop: "0.8vh", lineHeight: 1.1 }}>Entity Relationships</h2>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.8vh", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ display: "flex", gap: "0.8vw", alignItems: "center", flex: 1 }}>
              <div style={{ background: "#162F50", border: "0.15vw solid #E8631A", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>PurchaseOrder</span>
              </div>
              <span className="font-body" style={{ fontSize: "1.8vw", color: "#8FA3B8" }}>→</span>
              <div style={{ background: "#162F50", border: "0.15vw solid rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>Supplier</span>
              </div>
            </div>
            <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", flexShrink: 0 }}>many POs belong to one supplier</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ display: "flex", gap: "0.8vw", alignItems: "center", flex: 1 }}>
              <div style={{ background: "#162F50", border: "0.15vw solid #E8631A", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>PurchaseOrder</span>
              </div>
              <span className="font-body" style={{ fontSize: "1.8vw", color: "#8FA3B8" }}>→</span>
              <div style={{ background: "#162F50", border: "0.15vw solid rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>GoodsReceipt</span>
              </div>
              <span className="font-body" style={{ fontSize: "1.8vw", color: "#8FA3B8" }}>→</span>
              <div style={{ background: "#162F50", border: "0.15vw solid rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>InventoryMovement</span>
              </div>
            </div>
            <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", flexShrink: 0 }}>inbound procurement chain</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ display: "flex", gap: "0.8vw", alignItems: "center", flex: 1 }}>
              <div style={{ background: "#162F50", border: "0.15vw solid #E8631A", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>SalesOrder</span>
              </div>
              <span className="font-body" style={{ fontSize: "1.8vw", color: "#8FA3B8" }}>→</span>
              <div style={{ background: "#162F50", border: "0.15vw solid rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>PickingTask</span>
              </div>
              <span className="font-body" style={{ fontSize: "1.8vw", color: "#8FA3B8" }}>→</span>
              <div style={{ background: "#162F50", border: "0.15vw solid rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>Shipment</span>
              </div>
            </div>
            <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", flexShrink: 0 }}>outbound fulfillment chain</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ display: "flex", gap: "0.8vw", alignItems: "center", flex: 1 }}>
              <div style={{ background: "#162F50", border: "0.15vw solid #E8631A", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>Inventory</span>
              </div>
              <span className="font-body" style={{ fontSize: "1.8vw", color: "#8FA3B8" }}>↔</span>
              <div style={{ background: "#162F50", border: "0.15vw solid rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>Location (bin-level)</span>
              </div>
            </div>
            <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", flexShrink: 0 }}>stock tracked per bin</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(232,99,26,0.08)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <div style={{ display: "flex", gap: "0.8vw", alignItems: "center", flex: 1 }}>
              <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>All movements</span>
              <span className="font-body" style={{ fontSize: "1.8vw", color: "#E8631A" }}>→</span>
              <div style={{ background: "#162F50", border: "0.15vw solid #E8631A", borderRadius: "0.4vw", padding: "0.6vh 1.2vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8" }}>InventoryMovement</span>
              </div>
            </div>
            <span className="font-body" style={{ fontSize: "1.5vw", color: "#E8631A", flexShrink: 0 }}>immutable audit trail</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
