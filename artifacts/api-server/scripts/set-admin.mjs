import { db } from "@workspace/db";
import { userRolesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const clerkUserId = process.argv[2];
const role = process.argv[3] || "admin";

if (!clerkUserId) {
  console.log("Usage: node scripts/set-admin.mjs <clerk_user_id> [role]");
  process.exit(1);
}

const existing = await db.query.userRolesTable.findFirst({
  where: eq(userRolesTable.clerkUserId, clerkUserId),
});

if (!existing) {
  console.log(`User ${clerkUserId} not found`);
  process.exit(1);
}

await db
  .update(userRolesTable)
  .set({ role })
  .where(eq(userRolesTable.clerkUserId, clerkUserId));

console.log(`Updated ${clerkUserId} to ${role}`);