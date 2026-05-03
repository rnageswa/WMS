export default function Slide22BuildStatus() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-primary flex flex-col items-center justify-center">
      {/* Diagonal accent block */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #0F2540 0%, #0F2540 55%, #162F50 55%, #162F50 100%)",
        }}
      />

      {/* Orange vertical bar */}
      <div className="absolute left-[8vw] top-[20vh] bottom-[20vh] w-[0.4vw] bg-accent rounded-full" />

      {/* Bottom-right decorative grid */}
      <div className="absolute bottom-0 right-0 w-[30vw] h-[30vh] opacity-5"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, #E8631A 0, #E8631A 1px, transparent 1px, transparent 4vh), repeating-linear-gradient(90deg, #E8631A 0, #E8631A 1px, transparent 1px, transparent 4vw)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 pl-[12vw] w-full">
        <p className="font-body text-accent tracking-[0.3em] text-[1.4vw] uppercase mb-[2vh]">
          WareIQ · May 2026
        </p>
        <h1
          className="font-display font-black text-text leading-none tracking-tighter"
          style={{ fontSize: "7vw", textWrap: "balance" }}
        >
          Current
          <br />
          <span className="text-accent">Build Status</span>
        </h1>
        <p className="font-body text-muted text-[1.8vw] mt-[3vh] max-w-[40vw] leading-relaxed">
          A full accounting of every feature shipped in the MVP and what remains on the roadmap.
        </p>

        {/* Stats row */}
        <div className="flex gap-[4vw] mt-[5vh]">
          <div>
            <p className="font-display font-black text-text text-[4vw] leading-none">14</p>
            <p className="font-body text-muted text-[1.3vw] mt-[0.5vh]">modules built</p>
          </div>
          <div className="w-px bg-surface self-stretch" />
          <div>
            <p className="font-display font-black text-accent text-[4vw] leading-none">6</p>
            <p className="font-body text-muted text-[1.3vw] mt-[0.5vh]">pending tasks</p>
          </div>
          <div className="w-px bg-surface self-stretch" />
          <div>
            <p className="font-display font-black text-text text-[4vw] leading-none">MVP</p>
            <p className="font-body text-muted text-[1.3vw] mt-[0.5vh]">production-ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}
