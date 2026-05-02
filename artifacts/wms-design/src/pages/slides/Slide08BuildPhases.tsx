export default function Slide08BuildPhases() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(232,99,26,0.07) 0%, transparent 60%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "3vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Delivery</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.8vw", color: "#F0EDE8", marginTop: "0.8vh", lineHeight: 1.1 }}>MVP Build Phases</h2>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.8vh", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: "2vw", alignItems: "stretch" }}>
            <div style={{ width: "8vw", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#E8631A", borderRadius: "0.8vw" }}>
              <div className="font-display font-700" style={{ fontSize: "2.5vw", color: "#0F2540" }}>1</div>
              <div className="font-body" style={{ fontSize: "1.3vw", color: "#0F2540", opacity: 0.7 }}>Wk 1–3</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.8vw", color: "#F0EDE8", marginBottom: "0.6vh" }}>SKU + Inventory + Locations</div>
                <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Product catalog · bin-level stock tracking · warehouse structure setup</div>
              </div>
              <div style={{ flexShrink: 0, background: "rgba(232,99,26,0.15)", borderRadius: "0.5vw", padding: "0.8vh 1.5vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A" }}>3 weeks</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "2vw", alignItems: "stretch" }}>
            <div style={{ width: "8vw", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(232,99,26,0.7)", borderRadius: "0.8vw" }}>
              <div className="font-display font-700" style={{ fontSize: "2.5vw", color: "#0F2540" }}>2</div>
              <div className="font-body" style={{ fontSize: "1.3vw", color: "#0F2540", opacity: 0.7 }}>Wk 4–6</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.8vw", color: "#F0EDE8", marginBottom: "0.6vh" }}>Procurement + Goods Receipt</div>
                <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Supplier management · PO lifecycle · receiving against PO with partial support</div>
              </div>
              <div style={{ flexShrink: 0, background: "rgba(232,99,26,0.15)", borderRadius: "0.5vw", padding: "0.8vh 1.5vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A" }}>3 weeks</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "2vw", alignItems: "stretch" }}>
            <div style={{ width: "8vw", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(232,99,26,0.4)", borderRadius: "0.8vw" }}>
              <div className="font-display font-700" style={{ fontSize: "2.5vw", color: "#F0EDE8" }}>3</div>
              <div className="font-body" style={{ fontSize: "1.3vw", color: "#F0EDE8", opacity: 0.7 }}>Wk 7–9</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.8vw", color: "#F0EDE8", marginBottom: "0.6vh" }}>Orders + Picking + Packing + Dispatch</div>
                <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Full outbound workflow · pick list generation · packing slips · shipment tracking</div>
              </div>
              <div style={{ flexShrink: 0, background: "rgba(232,99,26,0.15)", borderRadius: "0.5vw", padding: "0.8vh 1.5vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A" }}>3 weeks</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "2vw", alignItems: "stretch" }}>
            <div style={{ width: "8vw", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(232,99,26,0.2)", borderRadius: "0.8vw" }}>
              <div className="font-display font-700" style={{ fontSize: "2.5vw", color: "#F0EDE8" }}>4</div>
              <div className="font-body" style={{ fontSize: "1.3vw", color: "#F0EDE8", opacity: 0.7 }}>Wk 10–11</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.8vw", color: "#F0EDE8", marginBottom: "0.6vh" }}>Reports + Polish + QA</div>
                <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Reporting suite · bug fixing · UAT · performance tuning</div>
              </div>
              <div style={{ flexShrink: 0, background: "rgba(232,99,26,0.15)", borderRadius: "0.5vw", padding: "0.8vh 1.5vw" }}>
                <span className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A" }}>2 weeks</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "0.5vh", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1vw" }}>
            <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Total timeline:</span>
            <span className="font-display font-700" style={{ fontSize: "2vw", color: "#E8631A" }}>10–11 weeks</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
