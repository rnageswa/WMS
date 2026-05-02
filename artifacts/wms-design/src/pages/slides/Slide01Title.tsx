const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      <img
        src={`${base}hero-warehouse.png`}
        crossOrigin="anonymous"
        alt="Warehouse interior"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(15,37,64,0.95) 0%, rgba(15,37,64,0.6) 60%, rgba(232,99,26,0.15) 100%)" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ paddingLeft: "8vw", paddingRight: "8vw" }}>
        <div className="mb-[2vh]" style={{ display: "flex", alignItems: "center", gap: "1.2vw" }}>
          <div style={{ width: "3.5vw", height: "0.25vh", background: "#E8631A" }} />
          <span className="font-display font-600 tracking-widest uppercase" style={{ fontSize: "1.2vw", color: "#E8631A", letterSpacing: "0.25em" }}>MVP Design Blueprint</span>
        </div>

        <h1 className="font-display font-700 tracking-tight" style={{ fontSize: "6.5vw", color: "#F0EDE8", lineHeight: 1.05, textWrap: "balance", maxWidth: "60vw" }}>
          Warehouse
          <span style={{ color: "#E8631A" }}> Management</span>
          <br />System
        </h1>

        <p className="font-body" style={{ fontSize: "1.8vw", color: "#8FA3B8", marginTop: "3vh", maxWidth: "45vw", lineHeight: 1.5 }}>
          System Architecture · Database Schema · API Design
          <br />UI Wireframes · Development Plan
        </p>

        <div style={{ marginTop: "5vh", display: "flex", alignItems: "center", gap: "2vw" }}>
          <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Version 1.0 — 2026</span>
          <div style={{ width: "0.15vw", height: "1.8vh", background: "#8FA3B8", opacity: 0.4 }} />
          <span className="font-body" style={{ fontSize: "1.5vw", color: "#8FA3B8" }}>Phase 1 of 4</span>
        </div>
      </div>

      <div className="absolute right-0 top-0 bottom-0" style={{ width: "35vw", background: "linear-gradient(to left, rgba(232,99,26,0.08) 0%, transparent 100%)" }} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.4vh", background: "linear-gradient(to right, #E8631A, transparent 60%)" }} />
    </div>
  );
}
