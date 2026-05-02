export default function Slide19StoriesReports() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Phase 4 · User Stories</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.5vw", color: "#F0EDE8", marginTop: "0.6vh", lineHeight: 1.1 }}>Reports &amp; User Management</h2>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "#E8631A", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#0F2540" }}>US-13</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to view a current stock report filtered by SKU, category, or bin so that I can audit inventory levels at any moment without exporting data manually.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.65)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#0F2540" }}>US-14</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to receive a low-stock alert when any SKU falls below a defined threshold so that replenishment can be initiated before a stockout occurs.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#F0EDE8" }}>US-15</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to view the full inventory movement log filtered by date range so that I can trace every stock change for audit and compliance purposes.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.25)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#F0EDE8" }}>US-16</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to create user accounts with Admin or Operator roles so that each team member has access only to the screens and actions their role permits.
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
