import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { requireCronSecret } from '@/lib/security/cron';

const parsePositiveInt = (value: string | undefined) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? Math.floor(parsed) : null;
};

export async function GET(request: Request) {
  const cronCheck = requireCronSecret(request);
  if (cronCheck) return cronCheck;

  const url = new URL(request.url);
  const retentionDaysParam = parsePositiveInt(url.searchParams.get('retentionDays') || undefined);
  const maxPerUserParam = parsePositiveInt(url.searchParams.get('maxPerUser') || undefined);

  const retentionDays =
    retentionDaysParam ??
    parsePositiveInt(process.env.NOTIFICATIONS_RETENTION_DAYS) ??
    90;

  const maxPerUser = maxPerUserParam ?? parsePositiveInt(process.env.NOTIFICATIONS_MAX_PER_USER);

  try {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deletedByAge = await prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    let deletedByLimit = 0;
    if (maxPerUser && maxPerUser > 0) {
      const result = await prisma.$executeRaw`
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) AS rn
          FROM "Notification"
        )
        DELETE FROM "Notification"
        WHERE id IN (SELECT id FROM ranked WHERE rn > ${maxPerUser});
      `;
      deletedByLimit = Number(result) || 0;
    }

    return NextResponse.json({
      success: true,
      retentionDays,
      maxPerUser: maxPerUser ?? null,
      deletedByAge: deletedByAge.count,
      deletedByLimit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Notification cleanup failed:', error);
    return NextResponse.json({ error: 'Failed to cleanup notifications' }, { status: 500 });
  }
}
