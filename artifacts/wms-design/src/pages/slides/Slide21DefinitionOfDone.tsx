export default function Slide21DefinitionOfDone() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(232,99,26,0.1) 0%, transparent 50%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "4vw" }}>
        <div style={{ width: "30vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Quality Gate</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "4vw", color: "#F0EDE8", marginTop: "1vh", lineHeight: 1.1 }}>Definition of Done</h2>
          <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", marginTop: "2.5vh", lineHeight: 1.6 }}>
            Every user story must meet all criteria below before it is considered complete — not just functionally working.
          </p>
          <div style={{ marginTop: "3.5vh", padding: "2vh 2vw", background: "rgba(232,99,26,0.1)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <p className="font-body" style={{ fontSize: "1.5vw", color: "#E8631A", lineHeight: 1.5 }}>A story is not done until inventory numbers are correct. That is the only metric that matters at MVP.</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.3vh", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw" }}>
            <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", border: "0.2vw solid #E8631A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#E8631A" }} />
            </div>
            <span className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Acceptance criteria pass — all Given/When/Then conditions verified by QA</span>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw" }}>
            <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", border: "0.2vw solid #E8631A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#E8631A" }} />
            </div>
            <span className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Unit and integration tests written and passing in CI</span>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw" }}>
            <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", border: "0.2vw solid #E8631A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#E8631A" }} />
            </div>
            <span className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Inventory movement records written correctly with full audit fields</span>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw" }}>
            <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", border: "0.2vw solid #E8631A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#E8631A" }} />
            </div>
            <span className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Role boundaries enforced server-side — tested with both Admin and Operator tokens</span>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw" }}>
            <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", border: "0.2vw solid #E8631A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#E8631A" }} />
            </div>
            <span className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>API response schemas match the OpenAPI spec — no undocumented fields returned</span>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw" }}>
            <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", border: "0.2vw solid #E8631A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#E8631A" }} />
            </div>
            <span className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Code reviewed, merged to main, and deployed to staging without regression</span>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw" }}>
            <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", border: "0.2vw solid #E8631A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#E8631A" }} />
            </div>
            <span className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Product Owner sign-off obtained on UAT — story is closed in the backlog</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
