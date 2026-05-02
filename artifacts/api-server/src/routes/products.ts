import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import {
  CreateProductBody,
  UpdateProductBody,
  ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res) => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ message: "Invalid query parameters" });
    return;
  }
  const { search, category, isActive } = query.data;

  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (category) conditions.push(eq(productsTable.category, category));
  if (isActive !== undefined) conditions.push(eq(productsTable.isActive, isActive));

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productsTable.name);

  res.json(products);
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  try {
    const [product] = await db.insert(productsTable).values(body.data).returning();
    res.status(201).json(product);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ message: "SKU code or barcode already exists" });
    } else {
      throw err;
    }
  }
});

router.get("/products/:id", async (req, res) => {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, req.params.id));
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(product);
});

router.patch("/products/:id", async (req, res) => {
  const body = UpdateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  const [product] = await db
    .update(productsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(productsTable.id, req.params.id))
    .returning();
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(product);
});

router.delete("/products/:id", async (req, res) => {
  const [product] = await db
    .update(productsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(productsTable.id, req.params.id))
    .returning();
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(product);
});

export default router;
