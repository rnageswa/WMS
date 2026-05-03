import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { userRolesTable } from "@workspace/db/schema";
import { count, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export type Role = "admin" | "operator" | "viewer";

export async function requireAuth(req: any, res: any, next: any) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.userId = userId;

    let [userRole] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, userId))
      .limit(1);

    if (!userRole) {
      const [{ total }] = await db.select({ total: count() }).from(userRolesTable);
      const isFirst = total === 0;

      [userRole] = await db
        .insert(userRolesTable)
        .values({
          clerkUserId: userId,
          role: isFirst ? "admin" : "operator",
        })
        .returning();

      logger.info({ userId, role: userRole.role }, "New user role provisioned");
    }

    req.userRole = userRole.role as Role;
    next();
  } catch (err) {
    logger.error({ err }, "requireAuth middleware error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.userRole)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
}
