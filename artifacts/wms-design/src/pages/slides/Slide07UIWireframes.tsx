export default function Slide07UIWireframes() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 10% 90%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "4vw" }}>
        <div style={{ width: "30vw", display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: "0.5vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Frontend</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.8vw", color: "#F0EDE8", marginTop: "0.8vh", lineHeight: 1.1 }}>UI Wireframes</h2>
          <p className="font-body" style={{ fontSize: "1.6vw", color: "#8FA3B8", marginTop: "2vh", lineHeight: 1.6 }}>
            10 core screens covering the full warehouse workflow — from SKU setup through dispatch.
          </p>
          <div style={{ marginTop: "3vh", padding: "2vh 2vw", background: "rgba(232,99,26,0.1)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "0.8vh" }}>Design Principle</div>
            <p className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>Operator-first. Every screen optimized for speed, not aesthetics. Barcode scan support on inbound and picking screens.</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.1vh", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: "1.2vw" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>01</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Dashboard</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Stock overview · Low stock alerts · Activity</div>
              </div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>02</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>SKU Management</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>List · Create · Edit products</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.2vw" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>03</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Purchase Orders</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Draft → Approved → Received</div>
              </div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>04</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Goods Receipt</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Receive against PO · assign bin</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.2vw" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>05</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Inventory</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Bin-level stock · movement log</div>
              </div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>06</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Sales Orders</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Create · track · order lines</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.2vw" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>07</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Picking</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Pick list generation · scan/confirm</div>
              </div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>08</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Packing & Dispatch</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Packing slip · mark shipped</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.2vw" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>09</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>Reports</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Stock · low-stock · orders · movements</div>
              </div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "0.5vw", padding: "1.4vh 1.5vw", display: "flex", alignItems: "baseline", gap: "1vw" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#E8631A" }}>10</span>
              <div>
                <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#F0EDE8" }}>User Management</div>
                <div className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>Roles · access control</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
