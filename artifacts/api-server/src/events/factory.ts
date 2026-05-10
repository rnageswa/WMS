// ── Event Factory ───────────────────────────────────────────────────────────────
// Helper to create domain events with consistent structure.

import type { DomainEvent, EventType } from "./types";

let counter = 0;

export function createEvent<T>(
  type: EventType,
  payload: T,
  source: string,
  correlationId?: string
): DomainEvent<T> {
  counter++;
  return {
    id: `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    occurredAt: new Date().toISOString(),
    source,
    correlationId,
  };
}
