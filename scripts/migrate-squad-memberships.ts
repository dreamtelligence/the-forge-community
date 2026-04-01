/**
 * DATA MIGRATION: User.squadId → SquadMember
 *
 * This script migrates existing squad memberships from the old system
 * (User.squadId) to the new many-to-many system (SquadMember).
 *
 * Run BEFORE pushing the schema changes!
 */

import { prisma } from '../lib/prisma';

async function migrateSquadMemberships() {
  console.log('🔍 Checking for existing squad memberships...');

  try {
    // Find all users with a squadId set
    const usersWithSquad = await prisma.$queryRaw<Array<{ id: string; squadId: string }>>`
      SELECT id, "squadId"
      FROM "User"
      WHERE "squadId" IS NOT NULL
    `;

    if (usersWithSquad.length === 0) {
      console.log('✅ No existing squad memberships found. Safe to proceed.');
      return;
    }

    console.log(`📦 Found ${usersWithSquad.length} users with squad memberships.`);
    console.log('🔄 Migrating to SquadMember table...\n');

    let migrated = 0;
    let errors = 0;

    for (const user of usersWithSquad) {
      try {
        // Create SquadMember entry
        await prisma.$executeRaw`
          INSERT INTO "SquadMember" (id, "userId", "squadId", role, "joinedAt")
          VALUES (
            'sm_' || gen_random_uuid()::text,
            ${user.id},
            ${user.squadId},
            'MEMBER',
            NOW()
          )
          ON CONFLICT ("userId", "squadId") DO NOTHING
        `;

        migrated++;
        console.log(`  ✓ Migrated user ${user.id} → squad ${user.squadId}`);
      } catch (error) {
        errors++;
        console.error(`  ✗ Failed to migrate user ${user.id}:`, error);
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Errors: ${errors}`);

    if (errors === 0) {
      console.log('\n🚀 Safe to run: npx prisma db push');
    } else {
      console.log('\n⚠️  Some migrations failed. Check errors above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSquadMemberships();
