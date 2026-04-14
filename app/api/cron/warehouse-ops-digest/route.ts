import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import {
  buildWarehouseOpsDigest,
  buildWarehouseOpsDigestNotification,
  sendWarehouseOpsDigestEmail,
} from '@/lib/warehouse/automation';

export const maxDuration = 120;

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function startOfTodayUtc(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sendEmpty = parseBoolean(process.env.WAREHOUSE_OPS_DIGEST_SEND_EMPTY);
  const sendEmail = process.env.WAREHOUSE_OPS_DIGEST_EMAIL_ENABLED !== '0';
  const maxVenturesRaw = Number(process.env.WAREHOUSE_OPS_DIGEST_MAX_VENTURES || '100');
  const maxVentures = Number.isFinite(maxVenturesRaw)
    ? Math.max(1, Math.min(500, Math.trunc(maxVenturesRaw)))
    : 100;

  try {
    const ventures = await prisma.venture.findMany({
      where: {
        owner: {
          accountStatus: 'ACTIVE',
        },
        OR: [
          { warehouseItems: { some: {} } },
          { fulfillmentOrders: { some: {} } },
          { inboundPackages: { some: {} } },
          { shipments: { some: {} } },
          { warehouseImportErrors: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: maxVentures,
    });

    const todayStart = startOfTodayUtc();
    const summary = {
      processedVentures: 0,
      notificationSent: 0,
      emailSent: 0,
      skippedNoSignal: 0,
      skippedDuplicate: 0,
      errors: 0,
    };

    for (const venture of ventures) {
      summary.processedVentures += 1;
      try {
        const digest = await buildWarehouseOpsDigest(venture.id, venture.name);

        if (!digest.actionable && !sendEmpty) {
          summary.skippedNoSignal += 1;
          continue;
        }

        const existing = await prisma.notification.findFirst({
          where: {
            userId: venture.ownerId,
            type: 'SYSTEM',
            title: { startsWith: 'LagerHub Ops Digest' },
            message: { contains: digest.marker },
            createdAt: { gte: todayStart },
          },
          select: { id: true },
        });

        if (existing) {
          summary.skippedDuplicate += 1;
          continue;
        }

        const notificationPayload = buildWarehouseOpsDigestNotification(digest);
        await prisma.notification.create({
          data: {
            userId: venture.ownerId,
            actorId: null,
            type: 'SYSTEM',
            title: notificationPayload.title,
            message: notificationPayload.message,
            href: notificationPayload.href,
            isRead: false,
          },
        });
        summary.notificationSent += 1;

        if (sendEmail && venture.owner.email) {
          const emailResult = await sendWarehouseOpsDigestEmail({
            to: venture.owner.email,
            digest,
          });
          if (emailResult.sent) summary.emailSent += 1;
        }
      } catch (ventureError) {
        summary.errors += 1;
        console.error(`Warehouse ops digest failed for venture ${venture.id}:`, ventureError);
      }
    }

    return NextResponse.json({
      success: true,
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Warehouse ops digest cron failed:', error);
    return NextResponse.json({ error: 'Warehouse ops digest failed' }, { status: 500 });
  }
}
