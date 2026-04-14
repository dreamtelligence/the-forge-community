import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { scanCompetitor, compareSnapshots } from '@/lib/security/watchdog';
import { sendNotification } from '@/lib/forum/notifications';
import { requireCronSecret } from '@/lib/security/cron';

export const maxDuration = 120; // 2 minutes for Vercel

export async function GET(request: NextRequest) {
  const cronCheck = requireCronSecret(request);
  if (cronCheck) return cronCheck;

  try {
    // 1. Find ventures to scan
    // We look for ventures where the latest snapshot is older than 7 days
    // or no snapshot exists yet.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const ventures = await prisma.venture.findMany({
      where: {
        brandDNA: {
          isNot: null
        },
        OR: [
          {
            competitorSnapshots: {
              none: {}
            }
          },
          {
            competitorSnapshots: {
              every: {
                scannedAt: { lt: sevenDaysAgo }
              }
            }
          }
        ]
      },
      include: {
        brandDNA: true,
        owner: true
      },
      take: 10 // Limit per run to avoid timeouts
    });

    const results = [];

    for (const venture of ventures) {
      const competitors = (venture.brandDNA?.competitors as any[]) || [];
      if (competitors.length === 0) continue;

      const ventureResults = { ventureId: venture.id, scans: [] as any[] };

      for (const comp of competitors) {
        if (!comp.url) continue;

        try {
          const lastSnapshot = await prisma.competitorSnapshot.findFirst({
            where: { ventureId: venture.id, competitorUrl: comp.url },
            orderBy: { scannedAt: 'desc' }
          });

          const scan = await scanCompetitor(comp.url);
          
          let changeSummary = null;
          let detected = false;
          if (lastSnapshot) {
            changeSummary = compareSnapshots(lastSnapshot.data as any, scan.snapshot);
            detected = !!changeSummary;
          }

          await prisma.competitorSnapshot.create({
            data: {
              ventureId: venture.id,
              competitorUrl: comp.url,
              competitorName: comp.name || 'Unknown',
              contentHash: scan.contentHash,
              priceHash: scan.priceHash,
              productHash: scan.productHash,
              data: scan.snapshot as any,
              changesDetected: detected,
              changeSummary: changeSummary
            }
          });

          if (detected) {
            await sendNotification({
              recipientId: venture.ownerId,
              actorId: venture.ownerId, // System trigger
              type: 'SYSTEM',
              title: `Watchdog: Änderung bei ${comp.name || comp.url}`,
              message: changeSummary || 'Änderungen erkannt.',
              link: `/forge/${venture.id}/marketing`
            });
          }

          ventureResults.scans.push({ url: comp.url, detected });
        } catch (err) {
          console.error(`Cron Watchdog failed for ${comp.url}`, err);
        }
      }
      results.push(ventureResults);
    }

    return NextResponse.json({ success: true, processed: ventures.length, details: results });

  } catch (error) {
    console.error('Cron Watchdog failed:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
