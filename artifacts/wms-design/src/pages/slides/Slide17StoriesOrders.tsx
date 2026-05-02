export default function Slide17StoriesOrders() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(232,99,26,0.06) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Phase 3 · User Stories</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.5vw", color: "#F0EDE8", marginTop: "0.6vh", lineHeight: 1.1 }}>Orders &amp; Fulfillment</h2>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "#E8631A", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#0F2540" }}>US-09</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse admin</span>, I want to create a sales order with line items (SKU + quantity) so that the warehouse team knows exactly what to pick and ship for each customer.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.65)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#0F2540" }}>US-10</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse operator</span>, I want to generate a pick list from a sales order and mark each line as picked so that I can fulfill orders accurately and at speed.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.4)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#F0EDE8" }}>US-11</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse operator</span>, I want to mark an order as packed and generate a packing slip so that dispatch has a printed record of what is in each outbound shipment.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "2vh 2.5vw", display: "grid", gridTemplateColumns: "5vw 1fr", gap: "1.5vw", alignItems: "start" }}>
            <div style={{ background: "rgba(232,99,26,0.25)", borderRadius: "0.4vw", padding: "0.5vh 0", textAlign: "center" }}>
              <span className="font-display font-700" style={{ fontSize: "1.2vw", color: "#F0EDE8" }}>US-12</span>
            </div>
            <div className="font-body" style={{ fontSize: "1.6vw", color: "#F0EDE8", lineHeight: 1.5 }}>
              As a <span style={{ color: "#E8631A" }}>warehouse operator</span>, I want to mark a shipment as dispatched and enter a tracking number so that stock is decremented and the order record is closed.
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
