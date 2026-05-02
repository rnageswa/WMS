export default function Slide03TechStack() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 80%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "8vh", left: "8vw", right: "8vw", bottom: "8vh", display: "flex", gap: "5vw" }}>
        <div style={{ width: "38vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Engineering</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "4.2vw", color: "#F0EDE8", marginTop: "1.5vh", lineHeight: 1.1 }}>Tech Stack</h2>
          <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", marginTop: "2.5vh", lineHeight: 1.6 }}>
            Proven, production-grade technologies chosen for developer velocity, type safety, and long-term maintainability.
          </p>

          <div style={{ marginTop: "4vh", display: "flex", flexDirection: "column", gap: "1.2vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
              <span className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8" }}>Full TypeScript — frontend to backend to schema</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
              <span className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8" }}>Containerized — portable across environments</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
              <span className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8" }}>Role-based auth — Admin and Warehouse Operator</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ width: "0.35vw", background: "#E8631A", flexShrink: 0 }} />
            <div style={{ padding: "2vh 2vw", flex: 1 }}>
              <div className="font-display font-600" style={{ fontSize: "1.2vw", color: "#E8631A", marginBottom: "0.5vh" }}>Frontend</div>
              <div className="font-body font-700" style={{ fontSize: "1.7vw", color: "#F0EDE8" }}>React + TypeScript + Tailwind CSS</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "stretch", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ width: "0.35vw", background: "#E8631A", flexShrink: 0 }} />
            <div style={{ padding: "2vh 2vw", flex: 1 }}>
              <div className="font-display font-600" style={{ fontSize: "1.2vw", color: "#E8631A", marginBottom: "0.5vh" }}>Backend</div>
              <div className="font-body font-700" style={{ fontSize: "1.7vw", color: "#F0EDE8" }}>Node.js + Express + TypeScript</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "stretch", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ width: "0.35vw", background: "#E8631A", flexShrink: 0 }} />
            <div style={{ padding: "2vh 2vw", flex: 1 }}>
              <div className="font-display font-600" style={{ fontSize: "1.2vw", color: "#E8631A", marginBottom: "0.5vh" }}>Database</div>
              <div className="font-body font-700" style={{ fontSize: "1.7vw", color: "#F0EDE8" }}>PostgreSQL + Drizzle ORM</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "stretch", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ width: "0.35vw", background: "#E8631A", flexShrink: 0 }} />
            <div style={{ padding: "2vh 2vw", flex: 1 }}>
              <div className="font-display font-600" style={{ fontSize: "1.2vw", color: "#E8631A", marginBottom: "0.5vh" }}>Auth</div>
              <div className="font-body font-700" style={{ fontSize: "1.7vw", color: "#F0EDE8" }}>Role-based — Admin / Operator</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "stretch", gap: "0", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", overflow: "hidden" }}>
            <div style={{ width: "0.35vw", background: "#E8631A", flexShrink: 0 }} />
            <div style={{ padding: "2vh 2vw", flex: 1 }}>
              <div className="font-display font-600" style={{ fontSize: "1.2vw", color: "#E8631A", marginBottom: "0.5vh" }}>Infrastructure</div>
              <div className="font-body font-700" style={{ fontSize: "1.7vw", color: "#F0EDE8" }}>Containerized, cloud-ready</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
