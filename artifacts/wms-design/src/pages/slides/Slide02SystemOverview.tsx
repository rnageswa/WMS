export default function Slide02SystemOverview() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(232,99,26,0.07) 0%, transparent 65%)" }} />

      <div className="absolute" style={{ top: "8vh", left: "8vw", right: "8vw", bottom: "8vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "3vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Architecture</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "4vw", color: "#F0EDE8", marginTop: "1vh", lineHeight: 1.1 }}>System Overview</h2>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vw", alignContent: "start" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "3vh 2.5vw", borderTop: "0.3vh solid #E8631A" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "1.5vh" }}>Modular Monolith</div>
            <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", lineHeight: 1.6 }}>Single deployable unit with clean internal module boundaries. Designed to split into services later without rewrites.</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "3vh 2.5vw", borderTop: "0.3vh solid #E8631A" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "1.5vh" }}>Single Warehouse</div>
            <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", lineHeight: 1.6 }}>Start with one warehouse. Data model includes warehouse ID on all entities — multi-warehouse is a configuration switch, not a rewrite.</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "3vh 2.5vw", borderTop: "0.3vh solid rgba(232,99,26,0.4)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "1.5vh" }}>REST API Backbone</div>
            <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", lineHeight: 1.6 }}>All operations via versioned REST endpoints. Mobile, web, and third-party integrations use the same API layer.</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "3vh 2.5vw", borderTop: "0.3vh solid rgba(232,99,26,0.4)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "1.5vh" }}>Clean Module Separation</div>
            <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", lineHeight: 1.6 }}>
              <span style={{ color: "#F0EDE8" }}>Inventory</span> · <span style={{ color: "#F0EDE8" }}>Orders</span> · <span style={{ color: "#F0EDE8" }}>Procurement</span>
              <br />Each module owns its domain logic and database tables.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
