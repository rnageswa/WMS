// ── Event Bus ───────────────────────────────────────────────────────────────────
// In-process event bus for domain events. Routes/engines emit → workers consume.
// BullMQ handles background job queuing. This bus handles synchronous listeners.

import { logger } from "../lib/logger";
import type { DomainEvent, EventType } from "./types";

type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

const listeners = new Map<EventType, Set<EventHandler>>();

export function on<T = unknown>(type: EventType, handler: EventHandler<T>): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(handler as EventHandler);
  // Return unsubscribe function
  return () => {
    listeners.get(type)?.delete(handler as EventHandler);
  };
}

export async function emit<T = unknown>(event: DomainEvent<T>): Promise<void> {
  logger.debug({ eventType: event.type, eventId: event.id }, "Event emitted");
  const handlers = listeners.get(event.type);
  if (!handlers || handlers.size === 0) return;
  for (const handler of handlers) {
    try {
      await handler(event);
    } catch (err) {
      logger.error({ err, eventType: event.type, eventId: event.id }, "Event handler failed");
    }
  }
}

export function emitSync<T = unknown>(event: DomainEvent<T>): void {
  logger.debug({ eventType: event.type, eventId: event.id }, "Event emitted (sync)");
  const handlers = listeners.get(event.type);
  if (!handlers || handlers.size === 0) return;
  for (const handler of handlers) {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        result.catch((err) => {
          logger.error({ err, eventType: event.type, eventId: event.id }, "Async event handler failed");
        });
      }
    } catch (err) {
      logger.error({ err, eventType: event.type, eventId: event.id }, "Event handler failed");
    }
  }
}
