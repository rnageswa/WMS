export default function Slide18AcceptanceOrders() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 80%, rgba(232,99,26,0.05) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "3.5vw" }}>
        <div style={{ width: "26vw", display: "flex", flexDirection: "column" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Phase 3 · Acceptance Criteria</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.5vw", color: "#F0EDE8", marginTop: "0.6vh", lineHeight: 1.1 }}>Orders &amp; Fulfillment</h2>
          <div style={{ marginTop: "3vh", padding: "2vh 2vw", background: "rgba(232,99,26,0.1)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A", marginBottom: "0.6vh" }}>Key Constraint</div>
            <p className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.5 }}>Inventory must decrement only on dispatch — not on pick or pack. This ensures accurate stock until the moment of physical departure.</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.4vh" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-09 — Sales Order</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a sales order is saved with at least one line item, then the system validates available stock and rejects the order if any line item quantity exceeds qty_on_hand.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-10 — Picking</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a pick list is generated, when the operator marks all lines as picked, then order status advances to "Picked" and the task is no longer visible in the active queue.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-11 — Packing</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given an order is marked packed, when the packing slip is generated, then it includes order number, customer, all line items with quantities, and a unique slip reference number.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-12 — Dispatch</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given an order is dispatched with a tracking number, then qty_on_hand decrements for each shipped SKU, an "outbound" InventoryMovement is written, and order status is set to "Shipped" — final state, no edits permitted.
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
