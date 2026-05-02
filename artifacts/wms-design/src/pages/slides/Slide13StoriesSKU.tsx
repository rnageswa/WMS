export default function Slide13StoriesSKU() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 85% 15%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "2.5vh", display: "flex", alignItems: "baseline", gap: "2vw" }}>
          <div>
            <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Phase 1 · User Stories</span>
            <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.5vw", color: "#F0EDE8", marginTop: "0.6vh", lineHeight: 1.1 }}>SKU &amp; Inventory</h2>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "#E8631A", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#0F2540" }}>US-01</span>
            </div>
            <div>
              <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
                As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to create a product SKU with name, category, barcode, unit of measure, and price so that all items are consistently identified across the system.
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.65)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#0F2540" }}>US-02</span>
            </div>
            <div>
              <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
                As a <span style={{ color: "#E8631A" }}>warehouse operator</span>, I want to view real-time stock levels per bin location so that I always know where stock is and how much remains.
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#F0EDE8" }}>US-03</span>
            </div>
            <div>
              <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
                As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to manually adjust inventory quantities with a reason code so that discrepancies from physical counts can be corrected with a full audit trail.
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.25)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#F0EDE8" }}>US-04</span>
            </div>
            <div>
              <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
                As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to define the warehouse structure (zones and bins) so that inventory can be tracked at bin level with a clear location hierarchy.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
