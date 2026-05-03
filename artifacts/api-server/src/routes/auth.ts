import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { userRolesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

// GET /auth/me — return current user's role
router.get("/auth/me", requireAuth, (req: any, res) => {
  res.json({
    userId: req.userId,
    role: req.userRole,
  });
});

// GET /auth/users — admin only, list all users
router.get("/auth/users", requireAuth, requireRole("admin"), async (_req, res) => {
  const users = await db
    .select()
    .from(userRolesTable)
    .orderBy(desc(userRolesTable.createdAt));
  res.json(users);
});

// PUT /auth/users/:clerkUserId/role — admin only
router.put(
  "/auth/users/:clerkUserId/role",
  requireAuth,
  requireRole("admin"),
  async (req: any, res) => {
    const { clerkUserId } = req.params;

    if (clerkUserId === req.userId) {
      res.status(400).json({ error: "You cannot change your own role." });
      return;
    }

    const parsed = z.object({ role: z.enum(["admin", "operator", "viewer"]) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid role. Must be admin, operator, or viewer." });
      return;
    }

    const [updated] = await db
      .update(userRolesTable)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(eq(userRolesTable.clerkUserId, clerkUserId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json(updated);
  }
);

export default router;
