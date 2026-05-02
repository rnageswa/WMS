export default function Slide10TestingStrategy() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 90% 50%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "5vw" }}>
        <div style={{ width: "32vw", display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: "0.5vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Quality</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.8vw", color: "#F0EDE8", marginTop: "0.8vh", lineHeight: 1.1 }}>Testing Strategy</h2>
          <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", marginTop: "2.5vh", lineHeight: 1.6 }}>
            Inventory accuracy is the foundation of trust. A single incorrect stock count destroys confidence in the system.
          </p>
          <div style={{ marginTop: "3vh", padding: "2vh 2vw", background: "rgba(232,99,26,0.1)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A", marginBottom: "0.8vh" }}>Critical path</div>
            <p className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>PO → Receipt → Inventory movement must be covered by E2E tests before any phase ships.</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh", justifyContent: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", gap: "2vw" }}>
            <div style={{ width: "0.4vw", background: "#E8631A", borderRadius: "0.2vw", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>Unit Tests</div>
              <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Service layer · utility functions · edge cases in business logic</div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", gap: "2vw" }}>
            <div style={{ width: "0.4vw", background: "#E8631A", borderRadius: "0.2vw", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>Integration Tests</div>
              <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>API endpoints with test database · response schemas · auth boundaries</div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", gap: "2vw" }}>
            <div style={{ width: "0.4vw", background: "#E8631A", borderRadius: "0.2vw", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>End-to-End Tests</div>
              <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>PO → Receipt → Inventory · Sales Order → Pick → Ship</div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", gap: "2vw" }}>
            <div style={{ width: "0.4vw", background: "#E8631A", borderRadius: "0.2vw", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>Performance</div>
              <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Inventory query load testing · concurrent picks · report generation at scale</div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", gap: "2vw" }}>
            <div style={{ width: "0.4vw", background: "#E8631A", borderRadius: "0.2vw", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>UAT</div>
              <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Warehouse operator acceptance · real workflow dry-runs before launch</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
