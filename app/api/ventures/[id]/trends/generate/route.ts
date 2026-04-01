import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateTrendReport } from '@/lib/trend-hunter';
import { reserveEnergy, settleEnergy, refundEnergy, InsufficientEnergyError } from '@/lib/energy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Verify access to venture and get BrandDNA
    const venture = await prisma.venture.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: user.id },
          {
            squad: {
              members: {
                some: {
                  userId: user.id,
                  leftAt: null
                }
              }
            }
          }
        ]
      },
      include: {
        brandDNA: true
      }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
    }

    if (!venture.brandDNA) {
      return NextResponse.json({ error: 'Brand DNA fehlt. Bitte erstelle zuerst eine Brand DNA.' }, { status: 400 });
    }

    // Energy System
    const COST = 10; // Fixed cost for Trend Hunter run
    let reservationId: string | null = null;

    try {
      const reservation = await reserveEnergy({
        userId: user.id,
        amount: COST,
        feature: 'trend.hunter',
        requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
        metadata: {
          ventureId: id,
          tool: 'TrendHunter'
        }
      });
      reservationId = reservation.reservationId;
    } catch (error) {
      if (error instanceof InsufficientEnergyError) {
        return NextResponse.json({
          error: error.message,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: error.requiredCredits,
          creditsAvailable: error.creditsAvailable
        }, { status: 402 });
      }
      throw error;
    }

    // Generate Report
    let reportData;
    try {
      reportData = await generateTrendReport(venture.brandDNA);
    } catch (error) {
      if (reservationId) {
        await refundEnergy(reservationId, 'ai-failed');
      }
      throw error;
    }

    // Save to Database & Settle Credits
    let report;
    try {
      report = await prisma.trendReport.create({
        data: {
          ventureId: id,
          category: venture.brandDNA.productCategory || 'General',
          data: reportData as any,
          status: 'COMPLETED'
        }
      });

      if (reservationId) {
        await settleEnergy({
          reservationId,
          finalCost: COST,
          provider: 'mixed', // brave + gemini
          model: 'mixed',
          usage: { totalTokens: 0 }, // Simplified tracking
          metadata: {
            reportId: report.id
          }
        });
      }
    } catch (error) {
      if (reservationId) {
        await refundEnergy(reservationId, 'trend-report-save-failed');
      }
      throw error;
    }

    return NextResponse.json({ report });

  } catch (error) {
    console.error('Trend generation failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message || 'Interner Serverfehler' }, { status: 500 });
  }
}
