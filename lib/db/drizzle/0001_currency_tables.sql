CREATE TABLE IF NOT EXISTS "currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "currencies_base_idx" ON "currencies" USING btree ("is_base");
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
