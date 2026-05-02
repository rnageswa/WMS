export default function Slide11WhatComesNext() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(232,99,26,0.1) 0%, transparent 50%, rgba(15,37,64,1) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(232,99,26,0.08) 0%, transparent 60%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "5vw", alignItems: "center" }}>
        <div style={{ width: "36vw" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>After MVP</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "4.2vw", color: "#F0EDE8", marginTop: "1vh", lineHeight: 1.1 }}>What Comes Next</h2>
          <p className="font-body" style={{ fontSize: "1.7vw", color: "#8FA3B8", marginTop: "3vh", lineHeight: 1.6 }}>
            Once the MVP is stable and trusted by the team, these are the natural next layers. Build only after the core is proven.
          </p>

          <div style={{ marginTop: "4vh", display: "flex", alignItems: "center", gap: "1.5vw" }}>
            <div style={{ width: "3.5vw", height: "0.25vh", background: "#E8631A" }} />
            <span className="font-display font-700" style={{ fontSize: "1.5vw", color: "#E8631A" }}>Discipline is the roadmap</span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Multi-warehouse support</div>
              <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8" }}>Warehouse ID is already in the schema — unlock it with configuration</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Mobile barcode scanning app</div>
              <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8" }}>React Native app consuming the same REST API</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Advanced picking strategies</div>
              <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8" }}>Wave picking · zone picking · route optimization</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>Carrier API integrations</div>
              <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8" }}>Automated label generation and real-time tracking</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>AI demand forecasting</div>
              <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8" }}>Reorder point prediction based on movement history</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", padding: "2vh 2.5vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#E8631A", flexShrink: 0 }} />
            <div>
              <div className="font-display font-700" style={{ fontSize: "1.6vw", color: "#F0EDE8" }}>ERP integration layer</div>
              <div className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8" }}>SAP, Oracle, or custom ERP via webhooks and event streams</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
