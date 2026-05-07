import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { userRolesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

// Public: check current clerk session with detailed debug
router.get("/auth/session-check", (req: any, res) => {
  // Manually check what Clerk is looking for
  const cookieHeader = req.headers.cookie || '';
  
  // Clerk looks for __session cookie (legacy) or __clerk_db_jwt
  const hasSessionToken = cookieHeader.includes('__clerk_db_jwt') || cookieHeader.includes('__session');
  const hasActiveContext = cookieHeader.includes('clerk_active_context');
  
  // Try getAuth again with more context
  const auth = getAuth(req);
  
  res.json({ 
    hasSession: !!auth?.userId, 
    clerkUserId: auth?.userId,
    userIdFromAuth: auth?.userId,
    hasSessionToken,
    hasActiveContext,
    cookieNames: (cookieHeader as string).split(';').map((c: string) => c.trim().split('=')[0]),
    allCookies: cookieHeader
  });
});

// Public: list all users (for debugging)
router.get("/auth/all-users", async (_req, res) => {
  const users = await db.select().from(userRolesTable).orderBy(desc(userRolesTable.createdAt));
  res.json(users);
});

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

// Debug: see current user's role from DB
router.get("/auth/debug-role", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [userRole] = await db
    .select()
    .from(userRolesTable)
    .where(eq(userRolesTable.clerkUserId, userId))
    .limit(1);

  res.json({ 
    clerkUserId: userId, 
    dbRole: userRole?.role || "NOT FOUND",
    rawDbRecord: userRole 
  });
});

// TEMP: Make first user admin (for dev only)
router.post("/auth/make-admin", async (req, res) => {
  const { clerkUserId } = req.body;
  if (!clerkUserId) {
    res.status(400).json({ error: "clerkUserId required" });
    return;
  }

  const [updated] = await db
    .update(userRolesTable)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(userRolesTable.clerkUserId, clerkUserId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ success: true, user: updated });
});

export default router;
