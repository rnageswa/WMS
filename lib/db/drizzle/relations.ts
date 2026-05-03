import { relations } from "drizzle-orm/relations";
import { warehouses, zones, bins, inventoryItems, products, inventoryMovements, suppliers, purchaseOrders, poStatusHistory, poTemplateLines, poTemplates, purchaseOrderLines, skuAlertOverrides } from "./schema";

export const zonesRelations = relations(zones, ({one, many}) => ({
	warehouse: one(warehouses, {
		fields: [zones.warehouseId],
		references: [warehouses.id]
	}),
	bins: many(bins),
}));

export const warehousesRelations = relations(warehouses, ({many}) => ({
	zones: many(zones),
}));

export const binsRelations = relations(bins, ({one, many}) => ({
	zone: one(zones, {
		fields: [bins.zoneId],
		references: [zones.id]
	}),
	inventoryItems: many(inventoryItems),
	inventoryMovements: many(inventoryMovements),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({one}) => ({
	bin: one(bins, {
		fields: [inventoryItems.binId],
		references: [bins.id]
	}),
	product: one(products, {
		fields: [inventoryItems.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	inventoryItems: many(inventoryItems),
	inventoryMovements: many(inventoryMovements),
	poTemplateLines: many(poTemplateLines),
	purchaseOrderLines: many(purchaseOrderLines),
	skuAlertOverrides: many(skuAlertOverrides),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({one}) => ({
	bin: one(bins, {
		fields: [inventoryMovements.binId],
		references: [bins.id]
	}),
	product: one(products, {
		fields: [inventoryMovements.productId],
		references: [products.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	supplier: one(suppliers, {
		fields: [purchaseOrders.supplierId],
		references: [suppliers.id]
	}),
	poStatusHistories: many(poStatusHistory),
	purchaseOrderLines: many(purchaseOrderLines),
}));

export const suppliersRelations = relations(suppliers, ({many}) => ({
	purchaseOrders: many(purchaseOrders),
	poTemplates: many(poTemplates),
}));

export const poStatusHistoryRelations = relations(poStatusHistory, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [poStatusHistory.poId],
		references: [purchaseOrders.id]
	}),
}));

export const poTemplateLinesRelations = relations(poTemplateLines, ({one}) => ({
	product: one(products, {
		fields: [poTemplateLines.productId],
		references: [products.id]
	}),
	poTemplate: one(poTemplates, {
		fields: [poTemplateLines.templateId],
		references: [poTemplates.id]
	}),
}));

export const poTemplatesRelations = relations(poTemplates, ({one, many}) => ({
	poTemplateLines: many(poTemplateLines),
	supplier: one(suppliers, {
		fields: [poTemplates.supplierId],
		references: [suppliers.id]
	}),
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderLines.poId],
		references: [purchaseOrders.id]
	}),
	product: one(products, {
		fields: [purchaseOrderLines.productId],
		references: [products.id]
	}),
}));

export const skuAlertOverridesRelations = relations(skuAlertOverrides, ({one}) => ({
	product: one(products, {
		fields: [skuAlertOverrides.productId],
		references: [products.id]
	}),
}));