export default function Slide23FeaturesShipped() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-primary flex flex-col px-[6vw] py-[5vh]">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[0.5vh] bg-accent" />

      {/* Header */}
      <div className="mb-[3vh]">
        <p className="font-body text-accent text-[1.2vw] tracking-widest uppercase mb-[0.8vh]">Build Status</p>
        <h2 className="font-display font-black text-text text-[3.2vw] tracking-tight leading-none">
          Features Shipped
        </h2>
      </div>

      {/* Three-column grid */}
      <div className="flex gap-[2vw] flex-1">

        {/* Column 1 — Inventory & Products */}
        <div className="flex-1 bg-surface rounded-xl px-[1.8vw] py-[2.5vh] flex flex-col gap-[1.8vh]">
          <div className="flex items-center gap-[0.8vw] mb-[0.5vh]">
            <div className="w-[0.5vw] h-[2.5vh] bg-accent rounded-full" />
            <h3 className="font-display font-bold text-text text-[1.5vw]">Inventory &amp; Products</h3>
          </div>
          <div className="flex flex-col gap-[1.2vh]">
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">SKU &amp; Product Management</p>
                <p className="font-body text-muted text-[1.05vw]">CRUD with categories, cost, reorder level</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Multi-Zone Bin System</p>
                <p className="font-body text-muted text-[1.05vw]">Warehouses → zones → bins hierarchy</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Inventory Item Tracking</p>
                <p className="font-body text-muted text-[1.05vw]">Per-bin quantity, lot, expiry date</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Barcode &amp; QR Scanning</p>
                <p className="font-body text-muted text-[1.05vw]">Camera scan → product lookup</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Supplier Management</p>
                <p className="font-body text-muted text-[1.05vw]">Supplier profiles linked to products</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Purchase Orders</p>
                <p className="font-body text-muted text-[1.05vw]">PO creation, status tracking, line items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 — Warehouse Operations */}
        <div className="flex-1 bg-surface rounded-xl px-[1.8vw] py-[2.5vh] flex flex-col gap-[1.8vh]">
          <div className="flex items-center gap-[0.8vw] mb-[0.5vh]">
            <div className="w-[0.5vw] h-[2.5vh] bg-accent rounded-full" />
            <h3 className="font-display font-bold text-text text-[1.5vw]">Warehouse Operations</h3>
          </div>
          <div className="flex flex-col gap-[1.2vh]">
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Goods Receipt (GRN)</p>
                <p className="font-body text-muted text-[1.05vw]">Receive PO items, assign to bins</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Dispatch &amp; Fulfillment</p>
                <p className="font-body text-muted text-[1.05vw]">Outbound order processing, pick list</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Stock Transfer</p>
                <p className="font-body text-muted text-[1.05vw]">Move items between bins and zones</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Cycle Counting</p>
                <p className="font-body text-muted text-[1.05vw]">Location-based inventory audit with variance</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Movements Log</p>
                <p className="font-body text-muted text-[1.05vw]">Full audit trail of all stock changes</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Reorder Alerts Dashboard</p>
                <p className="font-body text-muted text-[1.05vw]">In-app notifications for below-threshold SKUs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3 — Reporting & Alerts */}
        <div className="flex-1 bg-surface rounded-xl px-[1.8vw] py-[2.5vh] flex flex-col gap-[1.8vh]">
          <div className="flex items-center gap-[0.8vw] mb-[0.5vh]">
            <div className="w-[0.5vw] h-[2.5vh] bg-accent rounded-full" />
            <h3 className="font-display font-bold text-text text-[1.5vw]">Reporting &amp; Alerts</h3>
          </div>
          <div className="flex flex-col gap-[1.2vh]">
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Stock Value Report</p>
                <p className="font-body text-muted text-[1.05vw]">Value by category, chart + CSV export</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Supplier Performance</p>
                <p className="font-body text-muted text-[1.05vw]">Lead time, fill rate, on-time delivery</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Stock Velocity Analysis</p>
                <p className="font-body text-muted text-[1.05vw]">Days of stock remaining per SKU</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Velocity Email Alerts</p>
                <p className="font-body text-muted text-[1.05vw]">Daily scheduler + manual send via Resend</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">SKU Alert Exceptions</p>
                <p className="font-body text-muted text-[1.05vw]">Always/never override per product</p>
              </div>
            </div>
            <div className="flex items-start gap-[0.7vw]">
              <span className="text-accent text-[1.1vw] leading-tight mt-[0.2vh]">✓</span>
              <div>
                <p className="font-body font-semibold text-text text-[1.2vw] leading-tight">Alert History Log</p>
                <p className="font-body text-muted text-[1.05vw]">Full audit of every send with SKU snapshot</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[0.5vh] bg-surface" />
    </div>
  );
}
