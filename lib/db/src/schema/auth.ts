import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const userRolesTable = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  role: text("role").notNull().default("operator"), // 'admin' | 'operator' | 'viewer'
  displayName: text("display_name"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRole = typeof userRolesTable.$inferSelect;
