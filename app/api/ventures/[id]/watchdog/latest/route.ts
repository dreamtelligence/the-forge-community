import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getVentureAccessByEmail } from '@/lib/ventures/access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const access = await getVentureAccessByEmail(session.user.email, id);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    // We want the most recent snapshot for EACH unique competitor URL
    const snapshots = await prisma.$queryRaw`
      SELECT DISTINCT ON ("competitorUrl") *
      FROM "CompetitorSnapshot"
      WHERE "ventureId" = ${access.ventureId}
      ORDER BY "competitorUrl", "scannedAt" DESC
    `;

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Failed to fetch watchdog data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
