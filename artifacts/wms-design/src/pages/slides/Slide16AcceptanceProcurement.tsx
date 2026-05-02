export default function Slide16AcceptanceProcurement() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 90% 20%, rgba(232,99,26,0.05) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "3.5vw" }}>
        <div style={{ width: "26vw", display: "flex", flexDirection: "column" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Phase 2 · Acceptance Criteria</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.5vw", color: "#F0EDE8", marginTop: "0.6vh", lineHeight: 1.1 }}>Procurement &amp; Receiving</h2>
          <div style={{ marginTop: "3vh", padding: "2vh 2vw", background: "rgba(232,99,26,0.1)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A", marginBottom: "0.6vh" }}>Key Constraint</div>
            <p className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.5 }}>Partial receipt must not auto-close the PO. It stays "In Progress" until all lines are fully received or explicitly closed.</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.4vh" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-05 — Supplier Management</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a supplier is saved, when creating a PO, then the supplier appears in the dropdown with name, contact, and address pre-filled.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-06 — PO Lifecycle</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a PO is in Draft, when admin approves it, then status changes to Approved and no further line edits are permitted. When goods are received, status moves to Received and is immutable.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-07 — Goods Receipt</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a receipt line is saved with bin assignment, then qty_on_hand for that SKU at that bin increments exactly by the received quantity and an "inbound" InventoryMovement record is created.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-08 — Barcode Scan</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a barcode is scanned on the receipt screen, when a match exists, then SKU name and UOM auto-populate within 300ms with no manual typing required.
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
