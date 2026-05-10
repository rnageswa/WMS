// ── Base Repository ──────────────────────────────────────────────────────────────
// All repositories extend this. Provides common DB access pattern.

import { db } from "@workspace/db";
import type { PgTable } from "drizzle-orm/pg-core";

export class BaseRepository<T extends PgTable> {
  constructor(protected table: T) {}

  protected get db() {
    return db;
  }
}
