export default function Slide06APIDesign() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 80%, rgba(232,99,26,0.05) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>API</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.8vw", color: "#F0EDE8", marginTop: "0.8vh", lineHeight: 1.1 }}>API Design</h2>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5vw" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/products</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#E8631A" }}>GET POST PUT DELETE</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/suppliers</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST PUT</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/purchase-orders</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST PATCH</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/goods-receipts</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/locations</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST PUT</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/inventory</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET PATCH</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/inventory/movements</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/sales-orders</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST PATCH</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/picking-tasks</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST PATCH</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", padding: "1.5vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/shipments</span>
              <span className="font-body" style={{ fontSize: "1.3vw", color: "#8FA3B8" }}>GET POST PATCH</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "2vh", display: "flex", gap: "1.5vw" }}>
          <div style={{ flex: 1, background: "rgba(232,99,26,0.1)", borderRadius: "0.6vw", padding: "1.5vh 2vw", border: "0.1vw solid rgba(232,99,26,0.3)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/reports/*</span>
            <span className="font-body" style={{ fontSize: "1.3vw", color: "#E8631A" }}>stock · low-stock · orders · movements</span>
          </div>
          <div style={{ flex: 0.6, background: "rgba(232,99,26,0.1)", borderRadius: "0.6vw", padding: "1.5vh 2vw", border: "0.1vw solid rgba(232,99,26,0.3)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="font-display font-700" style={{ fontSize: "1.45vw", color: "#F0EDE8" }}>/api/auth/*</span>
            <span className="font-body" style={{ fontSize: "1.3vw", color: "#E8631A" }}>login · me · logout</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
