-- Phase 5: Currency, Costing, Pricing tables + missing columns on existing tables

-- ── Currencies ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "currencies_base_idx" ON "currencies" USING btree ("is_base");

-- ── Exchange Rates ──────────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" numeric(12, 6) NOT NULL,
	"effective_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchange_rates_from_to_idx" ON "exchange_rates" USING btree ("from_currency", "to_currency");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchange_rates_effective_idx" ON "exchange_rates" USING btree ("effective_date");

-- ── Inventory Valuation Log ─────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_valuation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"movement_id" uuid,
	"qty" integer NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"total_cost" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "valuation_log_product_id_idx" ON "inventory_valuation_log" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "valuation_log_movement_id_idx" ON "inventory_valuation_log" USING btree ("movement_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "valuation_log_created_at_idx" ON "inventory_valuation_log" USING btree ("created_at");

-- ── Price Lists ─────────────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_lists_default_idx" ON "price_lists" USING btree ("is_default");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_lists_active_idx" ON "price_lists" USING btree ("is_active");

-- ── Price List Items ─────────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_list_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"min_qty" integer DEFAULT 1 NOT NULL,
	"max_qty" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_list_items_unique_tier" UNIQUE("price_list_id", "product_id", "min_qty")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_list_items_list_id_idx" ON "price_list_items" USING btree ("price_list_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_list_items_product_id_idx" ON "price_list_items" USING btree ("product_id");

-- ── Sales Orders table (create if not exists, add missing columns) ──────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_id" uuid,
	"customer_email" text,
	"customer_phone" text,
	"shipping_address" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(12, 6),
	"notes" text,
	"expected_ship_date" date,
	"total_cogs" numeric(14, 2),
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_orders_order_number_unique" UNIQUE("order_number")
);

-- Add columns to sales_orders if table already exists
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(12, 6);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "total_cogs" numeric(14, 2);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "shipped_at" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Sales Order Lines ───────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty_ordered" integer NOT NULL,
	"qty_picked" integer DEFAULT 0 NOT NULL,
	"qty_packed" integer DEFAULT 0 NOT NULL,
	"qty_shipped" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(12, 2),
	"cost_at_time" numeric(12, 2),
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "so_lines_order_id_idx" ON "sales_order_lines" USING btree ("order_id");

-- ── Sales Order History ─────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales_order_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "so_history_order_id_idx" ON "sales_order_history" USING btree ("order_id");

-- ── Purchase Orders: add missing columns ───────────────────────────────────────
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(12, 6);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Inventory Items: add missing columns ───────────────────────────────────────
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "avg_cost" numeric(12, 4);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "inventory_value" numeric(14, 2);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Inventory Movements: add missing columns ───────────────────────────────────
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "unit_cost" numeric(12, 4);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "total_cost" numeric(14, 2);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Seed currencies ─────────────────────────────────────────────────────────────
--> statement-breakpoint
INSERT INTO "currencies" ("code", "name", "symbol", "is_base") VALUES
  ('USD', 'US Dollar', '$', true),
  ('INR', 'Indian Rupee', '₹', false),
  ('EUR', 'Euro', '€', false)
ON CONFLICT ("code") DO NOTHING;

-- ── Seed exchange rates ────────────────────────────────────────────────────────
--> statement-breakpoint
INSERT INTO "exchange_rates" ("from_currency", "to_currency", "rate", "effective_date") VALUES
  ('USD', 'INR', 83.120000, CURRENT_DATE),
  ('USD', 'EUR', 0.920000, CURRENT_DATE),
  ('INR', 'USD', 0.012030, CURRENT_DATE),
  ('EUR', 'USD', 1.086960, CURRENT_DATE),
  ('INR', 'EUR', 0.011070, CURRENT_DATE),
  ('EUR', 'INR', 90.347830, CURRENT_DATE)
ON CONFLICT DO NOTHING;
