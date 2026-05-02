export default function Slide09TeamRoles() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>People</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.8vw", color: "#F0EDE8", marginTop: "0.8vh", lineHeight: 1.1 }}>Team Roles &amp; Tasks</h2>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh", justifyContent: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "20vw 1fr", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ padding: "2.2vh 2vw", borderRight: "0.1vw solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#E8631A" }}>Backend Engineer</div>
              </div>
            </div>
            <div style={{ padding: "2.2vh 2vw", display: "flex", alignItems: "center" }}>
              <span className="font-body" style={{ fontSize: "1.55vw", color: "#8FA3B8", lineHeight: 1.4 }}>DB schema · API routes · business logic · auth middleware</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "20vw 1fr", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ padding: "2.2vh 2vw", borderRight: "0.1vw solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#E8631A" }}>Frontend Engineer</div>
              </div>
            </div>
            <div style={{ padding: "2.2vh 2vw", display: "flex", alignItems: "center" }}>
              <span className="font-body" style={{ fontSize: "1.55vw", color: "#8FA3B8", lineHeight: 1.4 }}>All UI screens · state management · API integration · barcode support</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "20vw 1fr", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ padding: "2.2vh 2vw", borderRight: "0.1vw solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#E8631A" }}>QA Engineer</div>
              </div>
            </div>
            <div style={{ padding: "2.2vh 2vw", display: "flex", alignItems: "center" }}>
              <span className="font-body" style={{ fontSize: "1.55vw", color: "#8FA3B8", lineHeight: 1.4 }}>Test cases · regression suites · UAT coordination · bug triage</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "20vw 1fr", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ padding: "2.2vh 2vw", borderRight: "0.1vw solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#E8631A" }}>DevOps</div>
              </div>
            </div>
            <div style={{ padding: "2.2vh 2vw", display: "flex", alignItems: "center" }}>
              <span className="font-body" style={{ fontSize: "1.55vw", color: "#8FA3B8", lineHeight: 1.4 }}>CI/CD pipeline · environment setup · deployment · monitoring</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "20vw 1fr", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ padding: "2.2vh 2vw", borderRight: "0.1vw solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#E8631A" }}>Product Owner</div>
              </div>
            </div>
            <div style={{ padding: "2.2vh 2vw", display: "flex", alignItems: "center" }}>
              <span className="font-body" style={{ fontSize: "1.55vw", color: "#8FA3B8", lineHeight: 1.4 }}>Requirements · backlog · acceptance criteria · stakeholder sign-off</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
