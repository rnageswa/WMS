// ── Domain Event Types ──────────────────────────────────────────────────────────

export type EventType =
  // Inventory events
  | "inventory.low_stock"
  | "inventory.negative_stock"
  | "inventory.received"
  | "inventory.adjusted"
  | "inventory.moved"
  // Order events
  | "order.created"
  | "order.confirmed"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  // PO events
  | "po.created"
  | "po.ordered"
  | "po.received"
  | "po.cancelled"
  // Picking events
  | "picking.started"
  | "picking.completed"
  // Anomaly events
  | "anomaly.detected"
  | "anomaly.resolved"
  // Replenishment events
  | "replenishment.recommendation_created"
  | "replenishment.pr_generated"
  // Cycle count events
  | "cyclecount.variance_detected"
  // Slotting events
  | "slotting.optimization_needed";

export interface DomainEvent<T = unknown> {
  id: string;
  type: EventType;
  payload: T;
  occurredAt: string; // ISO timestamp
  source: string;     // module that emitted
  correlationId?: string; // for tracing related events
}

// ── Event Payload Types ────────────────────────────────────────────────────────

export interface LowStockPayload {
  productId: string;
  skuCode: string;
  currentStock: number;
  reorderPoint: number;
  warehouseId?: string;
}

export interface NegativeStockPayload {
  productId: string;
  skuCode: string;
  binId: string;
  qtyOnHand: number;
}

export interface OrderShippedPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalCOGS: number;
  lineCount: number;
}

export interface OrderConfirmedPayload {
  orderId: string;
  orderNumber: string;
  currency: string;
  lineCount: number;
}

export interface POReceivedPayload {
  poId: string;
  poNumber: string;
  supplierId: string;
  linesReceived: number;
  totalQty: number;
}

export interface AnomalyDetectedPayload {
  anomalyType: string;
  severity: "low" | "medium" | "high" | "critical";
  productId?: string;
  referenceId?: string;
  referenceType?: string;
  description: string;
}

export interface CycleCountVariancePayload {
  productId: string;
  binId: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  variancePercent: number;
}

export interface ReplenishmentRecommendationPayload {
  productId: string;
  skuCode: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
  severity: "critical" | "warning";
}
