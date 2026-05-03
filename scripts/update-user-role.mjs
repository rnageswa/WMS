import 'dotenv/config';
import { db } from '@workspace/db';
import { userRolesTable } from '@workspace/db/src/schema/auth';
import { eq } from 'drizzle-orm';

async function main() {
  const clerkUserId = process.argv[2];
  
  if (!clerkUserId) {
    console.log('Usage: node update-user-role.mjs <clerk_user_id> [role]');
    console.log('Example: node update-user-role.mjs user_xxx admin');
    process.exit(1);
  }

  const role = process.argv[3] || 'admin';

  const existing = await db.query.userRolesTable.findFirst({
    where: eq(userRolesTable.clerkUserId, clerkUserId),
  });

  if (!existing) {
    console.log(`User ${clerkUserId} not found in database`);
    console.log('Creating new entry...');
    await db.insert(userRolesTable).values({
      clerkUserId,
      role,
    });
    console.log(`Created user ${clerkUserId} with role ${role}`);
    return;
  }

  await db.update(userRolesTable)
    .set({ role })
    .where(eq(userRolesTable.clerkUserId, clerkUserId));

  console.log(`Updated user ${clerkUserId} to ${role}`);
}

main();