import { Router } from "express";
import { db } from "@workspace/db";
import {
  warehousesTable,
  zonesTable,
  binsTable,
  productsTable,
  suppliersTable,
  inventoryItemsTable,
  purchaseOrdersTable,
  purchaseOrderLinesTable,
  poTemplatesTable,
  poTemplateLinesTable,
  inventoryMovementsTable,
  velocityAlertSettingsTable,
  skuAlertOverridesTable,
} from "@workspace/db/schema";

const router = Router();

router.post("/seed", async (req, res) => {
  try {
    console.log("🌱 Seeding database...");

    // 1. Warehouses
    const [wh1] = await db
      .insert(warehousesTable)
      .values({ name: "Main Warehouse", address: "123 Main St, City" })
      .returning();
    const [wh2] = await db
      .insert(warehousesTable)
      .values({ name: "Secondary Warehouse", address: "456 Secondary Ave" })
      .returning();
    console.log("✓ Warehouses created");

    // 2. Zones
    const [zone1] = await db
      .insert(zonesTable)
      .values({ warehouseId: wh1.id, name: "Receiving", code: "RCV" })
      .returning();
    const [zone2] = await db
      .insert(zonesTable)
      .values({ warehouseId: wh1.id, name: "Storage A", code: "STG-A" })
      .returning();
    const [zone3] = await db
      .insert(zonesTable)
      .values({ warehouseId: wh1.id, name: "Storage B", code: "STG-B" })
      .returning();
    console.log("✓ Zones created");

    // 3. Bins
    const [bin1] = await db.insert(binsTable).values({ zoneId: zone1.id, code: "A-01", name: "Receiving Bin 1" }).returning();
    const [bin2] = await db.insert(binsTable).values({ zoneId: zone2.id, code: "B-01", name: "Storage A Row 1" }).returning();
    const [bin3] = await db.insert(binsTable).values({ zoneId: zone2.id, code: "B-02", name: "Storage A Row 2" }).returning();
    const [bin4] = await db.insert(binsTable).values({ zoneId: zone3.id, code: "C-01", name: "Storage B Row 1" }).returning();
    console.log("✓ Bins created");

    // 4. Products
    const productData = [
      { skuCode: "SKU-001", name: "Widget A", description: "Standard widget", category: "Widgets", barcode: "123456789001", unitOfMeasure: "each", unitPrice: "10.99", reorderThreshold: 50 },
      { skuCode: "SKU-002", name: "Widget B", description: "Premium widget", category: "Widgets", barcode: "123456789002", unitOfMeasure: "each", unitPrice: "24.99", reorderThreshold: 30 },
      { skuCode: "SKU-003", name: "Gadget X", description: "Electronic gadget", category: "Electronics", barcode: "123456789003", unitOfMeasure: "each", unitPrice: "99.99", reorderThreshold: 10 },
      { skuCode: "SKU-004", name: "Part Y", description: "Mechanical part", category: "Parts", barcode: "123456789004", unitOfMeasure: "box", unitPrice: "45.00", reorderThreshold: 20 },
      { skuCode: "SKU-005", name: "Tool Z", description: "Hand tool", category: "Tools", barcode: "123456789005", unitOfMeasure: "each", unitPrice: "15.50", reorderThreshold: 15 },
      { skuCode: "SKU-006", name: "Material M", description: "Raw material", category: "Materials", barcode: "123456789006", unitOfMeasure: "kg", unitPrice: "5.25", reorderThreshold: 100 },
      { skuCode: "SKU-007", name: "Component C", description: "Electronic component", category: "Electronics", barcode: "123456789007", unitOfMeasure: "each", unitPrice: "2.50", reorderThreshold: 200 },
      { skuCode: "SKU-008", name: "Assembly Kit", description: "Pre-assembled kit", category: "Kits", barcode: "123456789008", unitOfMeasure: "kit", unitPrice: "150.00", reorderThreshold: 5 },
      { skuCode: "SKU-009", name: "Consumable Pack", description: "Office consumables", category: "Office", barcode: "123456789009", unitOfMeasure: "pack", unitPrice: "8.99", reorderThreshold: 25 },
      { skuCode: "SKU-010", name: "Safety Gear", description: "Protective equipment", category: "Safety", barcode: "123456789010", unitOfMeasure: "set", unitPrice: "35.00", reorderThreshold: 10 },
    ];

    const insertedProducts = await db.insert(productsTable).values(productData).returning();
    console.log("✓ Products created");

    // 5. Suppliers
    const [supplier1] = await db
      .insert(suppliersTable)
      .values({
        name: "Acme Supplies Co.",
        contactName: "John Doe",
        email: "john@acme.com",
        phone: "555-0101",
        address: "100 Supplier St",
        leadTimeDays: 7,
      })
      .returning();
    const [supplier2] = await db
      .insert(suppliersTable)
      .values({
        name: "Global Parts Ltd.",
        contactName: "Jane Smith",
        email: "jane@globalparts.com",
        phone: "555-0102",
        address: "200 Parts Ave",
        leadTimeDays: 14,
      })
      .returning();
    const [supplier3] = await db
      .insert(suppliersTable)
      .values({
        name: "Tech Components Inc.",
        contactName: "Bob Wilson",
        email: "bob@techcomponents.com",
        phone: "555-0103",
        address: "300 Tech Blvd",
        leadTimeDays: 5,
      })
      .returning();
    console.log("✓ Suppliers created");

    // 6. Inventory Items
    const inventoryData = insertedProducts.map((p, i) => ({
      productId: p.id,
      binId: [bin1, bin2, bin3, bin4][i % 4].id,
      qtyOnHand: Math.floor(Math.random() * 200) + 10,
    }));
    await db.insert(inventoryItemsTable).values(inventoryData);
    console.log("✓ Inventory created");

    // 7. Purchase Orders
    const [po1] = await db
      .insert(purchaseOrdersTable)
      .values({
        poNumber: "PO-2024-001",
        supplierName: supplier1.name,
        supplierId: supplier1.id,
        status: "ordered",
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .returning();
    const [po2] = await db
      .insert(purchaseOrdersTable)
      .values({
        poNumber: "PO-2024-002",
        supplierName: supplier2.name,
        supplierId: supplier2.id,
        status: "received",
      })
      .returning();
    const [po3] = await db
      .insert(purchaseOrdersTable)
      .values({
        poNumber: "PO-2024-003",
        supplierName: supplier3.name,
        supplierId: supplier3.id,
        status: "draft",
      })
      .returning();
    console.log("✓ Purchase Orders created");

    // 8. PO Lines
    await db.insert(purchaseOrderLinesTable).values([
      { poId: po1.id, productId: insertedProducts[0].id, qtyOrdered: 100, unitCost: "10.00", status: "ordered" },
      { poId: po1.id, productId: insertedProducts[1].id, qtyOrdered: 50, unitCost: "24.00", status: "partial" },
      { poId: po2.id, productId: insertedProducts[2].id, qtyOrdered: 20, unitCost: "95.00", status: "received" },
      { poId: po3.id, productId: insertedProducts[3].id, qtyOrdered: 200, unitCost: "42.00", status: "pending" },
    ]);
    console.log("✓ PO Lines created");

    // 9. PO Templates
    const [template1] = await db
      .insert(poTemplatesTable)
      .values({ name: "Weekly Widget Restock", supplierId: supplier1.id, supplierName: supplier1.name })
      .returning();
    const [template2] = await db
      .insert(poTemplatesTable)
      .values({ name: "Monthly Electronics", supplierId: supplier3.id, supplierName: supplier3.name })
      .returning();
    console.log("✓ PO Templates created");

    // 10. Template Lines
    await db.insert(poTemplateLinesTable).values([
      { templateId: template1.id, productId: insertedProducts[0].id, defaultQty: 50, defaultUnitCost: "10.00" },
      { templateId: template1.id, productId: insertedProducts[1].id, defaultQty: 25, defaultUnitCost: "24.00" },
      { templateId: template2.id, productId: insertedProducts[2].id, defaultQty: 10, defaultUnitCost: "95.00" },
    ]);
    console.log("✓ Template Lines created");

    // 11. Inventory Movements
    await db.insert(inventoryMovementsTable).values([
      { productId: insertedProducts[0].id, binId: bin2.id, movementType: "IN", quantity: 100, reasonCode: "PO_RECEIPT", createdBy: "system" },
      { productId: insertedProducts[1].id, binId: bin3.id, movementType: "IN", quantity: 50, reasonCode: "PO_RECEIPT", createdBy: "system" },
      { productId: insertedProducts[2].id, binId: bin4.id, movementType: "OUT", quantity: -5, reasonCode: "SHIPMENT", createdBy: "system" },
      { productId: insertedProducts[3].id, binId: bin2.id, movementType: "ADJUST", quantity: 10, reasonCode: "COUNT_ADJUST", createdBy: "admin" },
    ]);
    console.log("✓ Inventory Movements created");

    // 12. Velocity Alert Settings
    await db.insert(velocityAlertSettingsTable).values({
      thresholdDays: 14,
      lookbackDays: 30,
      recipientEmail: "alerts@warehouse.com",
      enabled: true,
    });
    console.log("✓ Velocity Alert Settings created");

    // 13. SKU Alert Overrides (for low stock alert testing)
    await db.insert(skuAlertOverridesTable).values([
      { productId: insertedProducts[0].id, mode: "suppress" },
      { productId: insertedProducts[1].id, mode: "always" },
    ]);
    console.log("✓ SKU Alert Overrides created");

    res.json({ success: true, message: "Seed completed successfully!" });
  } catch (err: any) {
    console.error("Seed failed:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;