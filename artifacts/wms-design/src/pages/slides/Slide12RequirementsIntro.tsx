export default function Slide12RequirementsIntro() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(232,99,26,0.12) 0%, transparent 55%)" }} />
      <div className="absolute" style={{ top: 0, left: 0, width: "0.5vw", height: "100vh", background: "linear-gradient(to bottom, #E8631A, transparent)" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ paddingLeft: "10vw", paddingRight: "10vw" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", marginBottom: "2vh" }}>
          <div style={{ width: "4vw", height: "0.25vh", background: "#E8631A" }} />
          <span className="font-display font-600 uppercase tracking-widest" style={{ fontSize: "1.2vw", color: "#E8631A", letterSpacing: "0.25em" }}>Section</span>
        </div>

        <h1 className="font-display font-700 tracking-tight" style={{ fontSize: "7vw", color: "#F0EDE8", lineHeight: 1.0 }}>
          Requirements
        </h1>

        <p className="font-body" style={{ fontSize: "2vw", color: "#8FA3B8", marginTop: "3vh", maxWidth: "52vw", lineHeight: 1.55 }}>
          User stories and acceptance criteria across all four build phases
        </p>

        <div style={{ marginTop: "5vh", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2vw", maxWidth: "68vw" }}>
          <div style={{ padding: "1.8vh 0", borderTop: "0.25vh solid #E8631A" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>Phase 1</div>
            <div className="font-body" style={{ fontSize: "1.4vw", color: "#8FA3B8" }}>SKU & Inventory</div>
          </div>
          <div style={{ padding: "1.8vh 0", borderTop: "0.25vh solid rgba(232,99,26,0.45)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>Phase 2</div>
            <div className="font-body" style={{ fontSize: "1.4vw", color: "#8FA3B8" }}>Procurement</div>
          </div>
          <div style={{ padding: "1.8vh 0", borderTop: "0.25vh solid rgba(232,99,26,0.3)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>Phase 3</div>
            <div className="font-body" style={{ fontSize: "1.4vw", color: "#8FA3B8" }}>Orders & Fulfillment</div>
          </div>
          <div style={{ padding: "1.8vh 0", borderTop: "0.25vh solid rgba(232,99,26,0.2)" }}>
            <div className="font-display font-700" style={{ fontSize: "1.5vw", color: "#F0EDE8", marginBottom: "0.5vh" }}>Phase 4</div>
            <div className="font-body" style={{ fontSize: "1.4vw", color: "#8FA3B8" }}>Reports & Admin</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
