import { pgTable, uuid, timestamp, text, integer, json, unique, boolean, foreignKey, check, numeric, date, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const alertSendLog = pgTable("alert_send_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	recipientEmail: text("recipient_email").notNull(),
	skuCount: integer("sku_count").notNull(),
	thresholdDays: integer("threshold_days").notNull(),
	lookbackDays: integer("lookback_days").notNull(),
	triggeredBy: text("triggered_by").default('manual').notNull(),
	skus: json().notNull(),
	status: text().default('sent').notNull(),
	errorMessage: text("error_message"),
});

export const userRoles = pgTable("user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	role: text().default('operator').notNull(),
	displayName: text("display_name"),
	email: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_roles_clerk_user_id_unique").on(table.clerkUserId),
]);

export const velocityAlertSettings = pgTable("velocity_alert_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	thresholdDays: integer("threshold_days").default(14).notNull(),
	lookbackDays: integer("lookback_days").default(30).notNull(),
	recipientEmail: text("recipient_email").default(').notNull(),
	enabled: boolean().default(false).notNull(),
	lastSentAt: timestamp("last_sent_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const zones = pgTable("zones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	warehouseId: uuid("warehouse_id").notNull(),
	name: text().notNull(),
	code: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "zones_warehouse_id_warehouses_id_fk"
		}).onDelete("cascade"),
]);

export const bins = pgTable("bins", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	zoneId: uuid("zone_id").notNull(),
	code: text().notNull(),
	name: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.zoneId],
			foreignColumns: [zones.id],
			name: "bins_zone_id_zones_id_fk"
		}).onDelete("cascade"),
	unique("bins_zone_code_unique").on(table.zoneId, table.code),
]);

export const inventoryItems = pgTable("inventory_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	binId: uuid("bin_id").notNull(),
	qtyOnHand: integer("qty_on_hand").default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.binId],
			foreignColumns: [bins.id],
			name: "inventory_items_bin_id_bins_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_items_product_id_products_id_fk"
		}).onDelete("restrict"),
	unique("inventory_product_bin_unique").on(table.productId, table.binId),
	check("qty_non_negative", sql`qty_on_hand >= 0`),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	skuCode: text("sku_code").notNull(),
	name: text().notNull(),
	description: text(),
	category: text(),
	barcode: text(),
	unitOfMeasure: text("unit_of_measure").default('each').notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	reorderThreshold: integer("reorder_threshold").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("products_sku_code_unique").on(table.skuCode),
	unique("products_barcode_unique").on(table.barcode),
]);

export const inventoryMovements = pgTable("inventory_movements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	binId: uuid("bin_id").notNull(),
	movementType: text("movement_type").notNull(),
	quantity: integer().notNull(),
	reasonCode: text("reason_code"),
	referenceId: uuid("reference_id"),
	referenceType: text("reference_type"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.binId],
			foreignColumns: [bins.id],
			name: "inventory_movements_bin_id_bins_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_movements_product_id_products_id_fk"
		}).onDelete("restrict"),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poNumber: text("po_number").notNull(),
	supplierName: text("supplier_name").notNull(),
	status: text().default('draft').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	supplierId: uuid("supplier_id"),
	expectedDeliveryDate: date("expected_delivery_date"),
}, (table) => [
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "purchase_orders_supplier_id_suppliers_id_fk"
		}).onDelete("set null"),
	unique("purchase_orders_po_number_unique").on(table.poNumber),
]);

export const poStatusHistory = pgTable("po_status_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	event: text().notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("po_status_history_po_id_idx").using("btree", table.poId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "po_status_history_po_id_purchase_orders_id_fk"
		}).onDelete("cascade"),
]);

export const poTemplateLines = pgTable("po_template_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	productId: uuid("product_id").notNull(),
	defaultQty: integer("default_qty").default(1).notNull(),
	defaultUnitCost: numeric("default_unit_cost", { precision: 12, scale:  4 }),
}, (table) => [
	index("po_template_lines_template_id_idx").using("btree", table.templateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "po_template_lines_product_id_products_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [poTemplates.id],
			name: "po_template_lines_template_id_po_templates_id_fk"
		}).onDelete("cascade"),
]);

export const poTemplates = pgTable("po_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	supplierId: uuid("supplier_id"),
	supplierName: text("supplier_name"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "po_templates_supplier_id_suppliers_id_fk"
		}).onDelete("set null"),
]);

export const suppliers = pgTable("suppliers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	contactName: text("contact_name"),
	email: text(),
	phone: text(),
	address: text(),
	leadTimeDays: integer("lead_time_days"),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const purchaseOrderLines = pgTable("purchase_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	productId: uuid("product_id").notNull(),
	qtyOrdered: integer("qty_ordered").notNull(),
	qtyReceived: integer("qty_received").default(0).notNull(),
	unitCost: numeric("unit_cost", { precision: 12, scale:  4 }),
	status: text().default('pending').notNull(),
}, (table) => [
	index("po_lines_po_id_idx").using("btree", table.poId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_lines_po_id_purchase_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "purchase_order_lines_product_id_products_id_fk"
		}).onDelete("restrict"),
]);

export const skuAlertOverrides = pgTable("sku_alert_overrides", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	mode: text().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "sku_alert_overrides_product_id_products_id_fk"
		}).onDelete("cascade"),
	unique("sku_alert_overrides_product_id_unique").on(table.productId),
]);

export const warehouses = pgTable("warehouses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	address: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// ── Sales Orders ─────────────────────────────────────────────────────────────────

export const salesOrders = pgTable("sales_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderNumber: text("order_number").notNull().unique(),
	customerName: text("customer_name").notNull(),
	customerId: uuid("customer_id"),
	customerEmail: text("customer_email"),
	customerPhone: text("customer_phone"),
	shippingAddress: text("shipping_address"),
	status: text().default('draft').notNull(),
	notes: text("notes"),
	expectedShipDate: date("expected_ship_date"),
	shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const salesOrderLines = pgTable("sales_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
	qtyOrdered: integer("qty_ordered").notNull(),
	qtyPicked: integer("qty_picked").notNull().default(0),
	qtyPacked: integer("qty_packed").notNull().default(0),
	qtyShipped: integer("qty_shipped").notNull().default(0),
	unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
	status: text().default('pending').notNull(),
}, (t) => [index("so_lines_order_id_idx").on(t.orderId)]);

export const salesOrderHistory = pgTable("sales_order_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
	event: text().notNull(),
	note: text("note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (t) => [index("so_history_order_id_idx").on(t.orderId)]);

export const pickingTasks = pgTable("picking_tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
	status: text().default('pending').notNull(),
	assignedTo: text("assigned_to"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const pickingLines = pgTable("picking_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull().references(() => pickingTasks.id, { onDelete: "cascade" }),
	orderLineId: uuid("order_line_id").notNull().references(() => salesOrderLines.id, { onDelete: "cascade" }),
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
	binId: uuid("bin_id"),
	qtyToPick: integer("qty_to_pick").notNull(),
	qtyPicked: integer("qty_picked").notNull().default(0),
	status: text().default('pending').notNull(),
	pickedAt: timestamp("picked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (t) => [index("picking_lines_task_id_idx").on(t.taskId)]);

export const shipments = pgTable("shipments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").references(() => salesOrders.id, { onDelete: "set null" }),
	trackingNumber: text("tracking_number"),
	carrier: text("carrier"),
	shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
