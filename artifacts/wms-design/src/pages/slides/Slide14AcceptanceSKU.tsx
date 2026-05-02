export default function Slide14AcceptanceSKU() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 10% 80%, rgba(232,99,26,0.05) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "3.5vw" }}>
        <div style={{ width: "26vw", display: "flex", flexDirection: "column" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Phase 1 · Acceptance Criteria</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.5vw", color: "#F0EDE8", marginTop: "0.6vh", lineHeight: 1.1 }}>SKU &amp; Inventory</h2>
          <div style={{ marginTop: "3vh", padding: "2vh 2vw", background: "rgba(232,99,26,0.1)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A", marginBottom: "0.6vh" }}>Format</div>
            <p className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.5 }}>Given / When / Then — each criterion maps to one user story and is testable by QA.</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.4vh" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-01 — SKU Creation</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a unique barcode is entered, when the admin saves the SKU, then it appears in the product list with all fields populated and barcode validated for uniqueness.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-02 — Real-time Stock View</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a stock movement is recorded, when the operator views the inventory screen, then bin quantities reflect the change within 1 second with no page refresh required.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-03 — Manual Adjustment</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given an adjustment is submitted with a reason code, when the system processes it, then qty_on_hand updates and an immutable InventoryMovement record is written with type "adjustment", user, timestamp, and reason.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-04 — Warehouse Structure</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a bin is created under a zone, when inventory is assigned, then the full path (Warehouse → Zone → Bin) is shown on all stock and movement screens with a unique bin code.
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
