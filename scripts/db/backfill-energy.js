require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = `${process.env.DATABASE_URL || ''}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TARGET = Number(process.env.ENERGY_BASELINE || 50);
const MODE = process.argv.includes('--reset') ? 'reset' : 'min';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, credits: true }
  });

  let updatedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    const current = Number(user.credits || 0);
    let delta = 0;

    if (MODE === 'reset') {
      delta = TARGET - current;
    } else if (current < TARGET) {
      delta = TARGET - current;
    }

    if (delta === 0) {
      skippedCount += 1;
      continue;
    }

    const type = delta > 0 ? 'GRANT' : 'ADJUSTMENT';

    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: MODE === 'reset'
          ? { credits: TARGET }
          : { credits: { increment: delta } },
        select: { credits: true }
      });

      await tx.energyTransaction.create({
        data: {
          userId: user.id,
          delta,
          balanceAfter: updated.credits,
          type,
          status: 'SETTLED',
          feature: 'system',
          metadata: {
            reason: 'baseline-backfill',
            mode: MODE,
            previousCredits: current,
            targetCredits: TARGET
          }
        }
      });
    });

    updatedCount += 1;
  }

  console.log(`Energy backfill complete. Updated: ${updatedCount}, skipped: ${skippedCount}`);
}

main()
  .catch((error) => {
    console.error('Energy backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
