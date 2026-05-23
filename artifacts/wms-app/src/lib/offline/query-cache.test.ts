import { describe, it, expect } from "vitest";
import { getTTLForUrl, TTL_PRODUCTS, TTL_BINS, TTL_INVENTORY, TTL_TASKS, TTL_PURCHASE_ORDERS, TTL_SUPPLIERS, TTL_DEFAULT } from "./query-cache";

describe("query-cache", () => {
  describe("getTTLForUrl", () => {
    it("returns TTL_PRODUCTS for /api/products", () => {
      expect(getTTLForUrl("/api/products")).toBe(TTL_PRODUCTS);
      expect(getTTLForUrl("/api/products?page=1")).toBe(TTL_PRODUCTS);
    });

    it("returns TTL_BINS for /api/bins", () => {
      expect(getTTLForUrl("/api/bins")).toBe(TTL_BINS);
      expect(getTTLForUrl("/api/bins?zone=A")).toBe(TTL_BINS);
    });

    it("returns TTL_INVENTORY for /api/inventory", () => {
      expect(getTTLForUrl("/api/inventory")).toBe(TTL_INVENTORY);
      expect(getTTLForUrl("/api/inventory?bin=B01")).toBe(TTL_INVENTORY);
    });

    it("returns TTL_TASKS for /api/picking-tasks", () => {
      expect(getTTLForUrl("/api/picking-tasks")).toBe(TTL_TASKS);
    });

    it("returns TTL_PURCHASE_ORDERS for /api/purchase-orders", () => {
      expect(getTTLForUrl("/api/purchase-orders")).toBe(TTL_PURCHASE_ORDERS);
      expect(getTTLForUrl("/api/purchase-orders?status=pending")).toBe(TTL_PURCHASE_ORDERS);
    });

    it("returns TTL_SUPPLIERS for /api/suppliers", () => {
      expect(getTTLForUrl("/api/suppliers")).toBe(TTL_SUPPLIERS);
    });

    it("returns TTL_DEFAULT for unknown URLs", () => {
      expect(getTTLForUrl("/api/unknown")).toBe(TTL_DEFAULT);
      expect(getTTLForUrl("/api/users")).toBe(TTL_DEFAULT);
      expect(getTTLForUrl("/api/custom-endpoint")).toBe(TTL_DEFAULT);
    });
  });

  describe("TTL constants", () => {
    it("have sensible values", () => {
      expect(TTL_PRODUCTS).toBe(24 * 60 * 60 * 1000);
      expect(TTL_BINS).toBe(24 * 60 * 60 * 1000);
      expect(TTL_INVENTORY).toBe(5 * 60 * 1000);
      expect(TTL_TASKS).toBe(10 * 60 * 1000);
      expect(TTL_PURCHASE_ORDERS).toBe(10 * 60 * 1000);
      expect(TTL_SUPPLIERS).toBe(60 * 60 * 1000);
      expect(TTL_DEFAULT).toBe(10 * 60 * 1000);
    });
  });
});