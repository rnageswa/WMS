export default function Slide25PendingTasks() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-primary flex flex-col px-[6vw] py-[5vh]">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[0.5vh] bg-accent" />

      {/* Decorative corner */}
      <div
        className="absolute bottom-0 right-0 w-[25vw] h-[25vw] opacity-[0.04]"
        style={{
          background: "radial-gradient(circle at bottom right, #E8631A 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="mb-[3.5vh]">
        <p className="font-body text-accent text-[1.2vw] tracking-widest uppercase mb-[0.8vh]">Roadmap</p>
        <h2 className="font-display font-black text-text text-[3.2vw] tracking-tight leading-none">
          Pending Tasks
        </h2>
        <p className="font-body text-muted text-[1.4vw] mt-[0.8vh]">
          Remaining items to complete the production-grade WMS.
        </p>
      </div>

      {/* Two-column task grid */}
      <div className="flex gap-[2.5vw] flex-1">

        {/* Left column */}
        <div className="flex-1 flex flex-col gap-[2vh]">

          <div className="bg-surface rounded-xl px-[1.8vw] py-[2vh] flex gap-[1.2vw]">
            <div className="w-[0.4vw] bg-accent rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-[1vw] mb-[0.5vh]">
                <p className="font-display font-bold text-text text-[1.3vw]">User Authentication &amp; RBAC</p>
                <span className="bg-accent/10 text-accent text-[1vw] font-body px-[0.7vw] py-[0.2vh] rounded-full">High</span>
              </div>
              <p className="font-body text-muted text-[1.1vw]">
                Login, session management, and role-based access (admin, operator, viewer) across all modules.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-xl px-[1.8vw] py-[2vh] flex gap-[1.2vw]">
            <div className="w-[0.4vw] bg-accent rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-[1vw] mb-[0.5vh]">
                <p className="font-display font-bold text-text text-[1.3vw]">Email Delivery Status &amp; Retry</p>
                <span className="bg-accent/10 text-accent text-[1vw] font-body px-[0.7vw] py-[0.2vh] rounded-full">In Progress</span>
              </div>
              <p className="font-body text-muted text-[1.1vw]">
                Track sent vs. failed alert sends in history log; one-click retry for failed entries.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-xl px-[1.8vw] py-[2vh] flex gap-[1.2vw]">
            <div className="w-[0.4vw] bg-muted/30 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-[1vw] mb-[0.5vh]">
                <p className="font-display font-bold text-text text-[1.3vw]">Multi-Warehouse Support</p>
                <span className="bg-muted/10 text-muted text-[1vw] font-body px-[0.7vw] py-[0.2vh] rounded-full">Planned</span>
              </div>
              <p className="font-body text-muted text-[1.1vw]">
                Switch context between warehouses; cross-warehouse transfer and consolidated reporting.
              </p>
            </div>
          </div>

        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col gap-[2vh]">

          <div className="bg-surface rounded-xl px-[1.8vw] py-[2vh] flex gap-[1.2vw]">
            <div className="w-[0.4vw] bg-muted/30 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-[1vw] mb-[0.5vh]">
                <p className="font-display font-bold text-text text-[1.3vw]">Mobile App (Expo)</p>
                <span className="bg-muted/10 text-muted text-[1vw] font-body px-[0.7vw] py-[0.2vh] rounded-full">Planned</span>
              </div>
              <p className="font-body text-muted text-[1.1vw]">
                Native iOS/Android app for warehouse floor staff — scan, receive, pick, and cycle-count on device.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-xl px-[1.8vw] py-[2vh] flex gap-[1.2vw]">
            <div className="w-[0.4vw] bg-muted/30 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-[1vw] mb-[0.5vh]">
                <p className="font-display font-bold text-text text-[1.3vw]">Demand Forecasting</p>
                <span className="bg-muted/10 text-muted text-[1vw] font-body px-[0.7vw] py-[0.2vh] rounded-full">Planned</span>
              </div>
              <p className="font-body text-muted text-[1.1vw]">
                Time-series model on movement history to predict stockouts and generate reorder suggestions.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-xl px-[1.8vw] py-[2vh] flex gap-[1.2vw]">
            <div className="w-[0.4vw] bg-muted/30 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-[1vw] mb-[0.5vh]">
                <p className="font-display font-bold text-text text-[1.3vw]">ERP / Accounting Integration</p>
                <span className="bg-muted/10 text-muted text-[1vw] font-body px-[0.7vw] py-[0.2vh] rounded-full">Planned</span>
              </div>
              <p className="font-body text-muted text-[1.1vw]">
                Push POs and GRNs to QuickBooks / Xero; sync product catalog from upstream ERP.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer note */}
      <div className="mt-[2vh] flex items-center gap-[0.8vw]">
        <div className="h-px flex-1 bg-surface" />
        <p className="font-body text-muted text-[1.1vw]">14 modules shipped · 6 pending · WareIQ MVP — May 2026</p>
        <div className="h-px flex-1 bg-surface" />
      </div>
    </div>
  );
}
