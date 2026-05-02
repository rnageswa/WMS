export default function Slide20AcceptanceReports() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 15% 85%, rgba(232,99,26,0.05) 0%, transparent 55%)" }} />

      <div className="absolute" style={{ top: "7vh", left: "8vw", right: "8vw", bottom: "7vh", display: "flex", gap: "3.5vw" }}>
        <div style={{ width: "26vw", display: "flex", flexDirection: "column" }}>
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.1vw", color: "#E8631A", letterSpacing: "0.2em" }}>Phase 4 · Acceptance Criteria</span>
          <h2 className="font-display font-700 tracking-tight" style={{ fontSize: "3.5vw", color: "#F0EDE8", marginTop: "0.6vh", lineHeight: 1.1 }}>Reports &amp; Admin</h2>
          <div style={{ marginTop: "3vh", padding: "2vh 2vw", background: "rgba(232,99,26,0.1)", borderRadius: "0.8vw", border: "0.1vw solid rgba(232,99,26,0.25)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.4vw", color: "#E8631A", marginBottom: "0.6vh" }}>Key Constraint</div>
            <p className="font-body" style={{ fontSize: "1.45vw", color: "#8FA3B8", lineHeight: 1.5 }}>Operators must never see user management screens. Role boundaries are enforced server-side, not just hidden in the UI.</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.4vh" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-13 — Stock Report</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given filters are applied, when the report renders, then results reflect the current qty_on_hand for every matching SKU and bin, with totals accurate to the second.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-14 — Low Stock Alert</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a SKU's qty_on_hand drops at or below its reorder threshold, then a low-stock banner appears on the dashboard within 60 seconds without requiring a manual refresh.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-15 — Movement Log</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given a date range is selected, when the log loads, then every InventoryMovement within that range is shown with type, SKU, quantity, bin, user, and timestamp — sorted newest first.
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.7vw", padding: "1.8vh 2vw" }}>
            <div className="font-display font-700" style={{ fontSize: "1.3vw", color: "#E8631A", marginBottom: "0.6vh" }}>US-16 — Role Management</div>
            <div className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8", lineHeight: 1.5 }}>
              Given an Operator token is used, when any admin-only API endpoint is called, then the server returns HTTP 403 regardless of the UI state. Role is verified on every request.
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
