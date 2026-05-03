export default function Slide24AlertSystem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-primary flex flex-col px-[6vw] py-[5vh]">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[0.5vh] bg-accent" />

      {/* Header */}
      <div className="mb-[3vh]">
        <p className="font-body text-accent text-[1.2vw] tracking-widest uppercase mb-[0.8vh]">Deep Dive</p>
        <h2 className="font-display font-black text-text text-[3.2vw] tracking-tight leading-none">
          Alert &amp; Reporting System
        </h2>
        <p className="font-body text-muted text-[1.4vw] mt-[1vh]">
          The most complex subsystem — velocity-based intelligence layered on top of raw inventory data.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-[3vw] flex-1">

        {/* Left — How it works */}
        <div className="flex-1 flex flex-col gap-[2vh]">
          <h3 className="font-display font-bold text-accent text-[1.6vw] uppercase tracking-wider">How It Works</h3>

          <div className="flex gap-[1.2vw] items-start">
            <div className="w-[2.8vw] h-[2.8vw] rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="font-display font-black text-primary text-[1.2vw]">1</span>
            </div>
            <div>
              <p className="font-body font-semibold text-text text-[1.25vw]">Compute velocity</p>
              <p className="font-body text-muted text-[1.1vw]">Divide movements over the lookback window (default 30 days) by days elapsed to get units/day per SKU.</p>
            </div>
          </div>

          <div className="flex gap-[1.2vw] items-start">
            <div className="w-[2.8vw] h-[2.8vw] rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="font-display font-black text-primary text-[1.2vw]">2</span>
            </div>
            <div>
              <p className="font-body font-semibold text-text text-[1.25vw]">Project runway</p>
              <p className="font-body text-muted text-[1.1vw]">Divide current stock by velocity. Flag any SKU where runway falls below the threshold (default 14 days).</p>
            </div>
          </div>

          <div className="flex gap-[1.2vw] items-start">
            <div className="w-[2.8vw] h-[2.8vw] rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="font-display font-black text-primary text-[1.2vw]">3</span>
            </div>
            <div>
              <p className="font-body font-semibold text-text text-[1.25vw]">Apply overrides</p>
              <p className="font-body text-muted text-[1.1vw]">SKU-level always/never rules override the threshold computation before the at-risk list is finalized.</p>
            </div>
          </div>

          <div className="flex gap-[1.2vw] items-start">
            <div className="w-[2.8vw] h-[2.8vw] rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="font-display font-black text-primary text-[1.2vw]">4</span>
            </div>
            <div>
              <p className="font-body font-semibold text-text text-[1.25vw]">Send &amp; log</p>
              <p className="font-body text-muted text-[1.1vw]">Resend delivers the HTML email. Every attempt is written to the alert history log with a full SKU snapshot.</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-surface self-stretch" />

        {/* Right — Config surface */}
        <div className="flex-1 flex flex-col gap-[1.8vh]">
          <h3 className="font-display font-bold text-accent text-[1.6vw] uppercase tracking-wider">Config Surface</h3>

          <div className="bg-surface rounded-xl px-[1.8vw] py-[1.8vh] flex flex-col gap-[1.4vh]">
            <div className="flex justify-between items-center border-b border-primary pb-[1vh]">
              <span className="font-body text-muted text-[1.1vw]">Threshold</span>
              <span className="font-display font-bold text-text text-[1.2vw]">7 / 14 / 30 / 60 days</span>
            </div>
            <div className="flex justify-between items-center border-b border-primary pb-[1vh]">
              <span className="font-body text-muted text-[1.1vw]">Lookback window</span>
              <span className="font-display font-bold text-text text-[1.2vw]">7 / 14 / 30 / 60 days</span>
            </div>
            <div className="flex justify-between items-center border-b border-primary pb-[1vh]">
              <span className="font-body text-muted text-[1.1vw]">Recipient email</span>
              <span className="font-display font-bold text-text text-[1.2vw]">Configurable</span>
            </div>
            <div className="flex justify-between items-center border-b border-primary pb-[1vh]">
              <span className="font-body text-muted text-[1.1vw]">Daily schedule</span>
              <span className="font-display font-bold text-text text-[1.2vw]">08:00 server time</span>
            </div>
            <div className="flex justify-between items-center border-b border-primary pb-[1vh]">
              <span className="font-body text-muted text-[1.1vw]">Manual trigger</span>
              <span className="font-display font-bold text-accent text-[1.2vw]">POST /send</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body text-muted text-[1.1vw]">SKU overrides</span>
              <span className="font-display font-bold text-text text-[1.2vw]">Per-product always / never</span>
            </div>
          </div>

          <div className="bg-surface rounded-xl px-[1.8vw] py-[1.8vh]">
            <p className="font-body font-semibold text-text text-[1.2vw] mb-[1vh]">History log captures</p>
            <div className="flex flex-wrap gap-[0.8vw]">
              <span className="bg-primary text-text font-body text-[1.05vw] px-[0.8vw] py-[0.4vh] rounded-full">timestamp</span>
              <span className="bg-primary text-text font-body text-[1.05vw] px-[0.8vw] py-[0.4vh] rounded-full">recipient</span>
              <span className="bg-primary text-text font-body text-[1.05vw] px-[0.8vw] py-[0.4vh] rounded-full">trigger source</span>
              <span className="bg-primary text-text font-body text-[1.05vw] px-[0.8vw] py-[0.4vh] rounded-full">SKU count</span>
              <span className="bg-primary text-text font-body text-[1.05vw] px-[0.8vw] py-[0.4vh] rounded-full">SKU snapshot</span>
              <span className="bg-primary text-text font-body text-[1.05vw] px-[0.8vw] py-[0.4vh] rounded-full">delivery status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
