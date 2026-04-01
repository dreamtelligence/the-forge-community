import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { scanCompetitor, compareSnapshots } from '@/lib/watchdog';
import { sendNotification } from '@/lib/notifications';
import { reserveEnergy, settleEnergy, refundEnergy, InsufficientEnergyError } from '@/lib/energy';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let reservationId: string | null = null;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const venture = await prisma.venture.findFirst({
      where: {
        id: id,
        OR: [{ ownerId: user.id }, { squad: { members: { some: { userId: user.id, leftAt: null } } } }]
      },
      include: { brandDNA: true }
    });

    if (!venture || !venture.brandDNA) {
      return NextResponse.json({ error: 'Venture or Brand DNA not found' }, { status: 404 });
    }

    const competitors = (venture.brandDNA.competitors as any[]) || [];
    if (competitors.length === 0) {
      return NextResponse.json({ error: 'Keine Konkurrenten in der Brand DNA hinterlegt.' }, { status: 400 });
    }

    // Energy System
    const COST = 5; 

    try {
      const reservation = await reserveEnergy({
        userId: user.id,
        amount: COST,
        feature: 'watchdog.scan',
        requestId: crypto.randomUUID(),
        metadata: { ventureId: id }
      });
      reservationId = reservation.reservationId;
    } catch (error) {
      if (error instanceof InsufficientEnergyError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'INSUFFICIENT_CREDITS',
            requiredCredits: error.requiredCredits,
            creditsAvailable: error.creditsAvailable,
          },
          { status: 402 }
        );
      }
      throw error;
    }

    const results = [];
    let totalChanges = 0;

    for (const comp of competitors) {
      if (!comp.url) continue;

      try {
        // 1. Get last snapshot
        const lastSnapshot = await prisma.competitorSnapshot.findFirst({
          where: { ventureId: id, competitorUrl: comp.url },
          orderBy: { scannedAt: 'desc' }
        });

        // 2. Scan now
        const scan = await scanCompetitor(comp.url);

        // 3. Compare
        let changeSummary = null;
        let detected = false;
        if (lastSnapshot) {
          changeSummary = compareSnapshots(lastSnapshot.data as any, scan.snapshot);
          detected = !!changeSummary;
        }

        // 4. Save

        if (detected) {
          totalChanges++;
          await sendNotification({
            recipientId: user.id,
            actorId: user.id, // System usually, but we use self here for simplicity or a system ID
            type: 'SYSTEM',
            title: `Watchdog: Änderung bei ${comp.name || comp.url}`,
            message: changeSummary || 'Änderungen erkannt.',
            link: `/forge/${id}/marketing` // Or a specialized watchdog page
          });
        }

        results.push({ name: comp.name, detected, changeSummary });

      } catch (err) {
        console.error(`Failed to scan ${comp.url}`, err);
      }
    }

    // Settle Energy
    if (reservationId) {
      await settleEnergy({
        reservationId,
        finalCost: COST,
        provider: 'watchdog',
        model: 'cheerio-lite',
        usage: { totalTokens: 0 },
        metadata: { changesFound: totalChanges }
      });
    }

    return NextResponse.json({ results, totalChanges });

  } catch (error) {
    if (reservationId) await refundEnergy(reservationId, 'failed');
    console.error('Watchdog failed:', error);
    return NextResponse.json({ error: 'Scan fehlgeschlagen' }, { status: 500 });
  }
}
