import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireAdmin } from '@/lib/admin';
import { reversePlatformLedgerEntry } from '@/lib/finance-ledger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type RouteParams = {
  params: Promise<{
    entryId: string;
  }>;
};

export async function POST(request: Request, context: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  try {
    const { entryId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!entryId) {
      return NextResponse.json({ error: 'Ledger entry ID missing' }, { status: 400 });
    }

    if (reason.length < 8) {
      return NextResponse.json(
        { error: 'Bitte gib einen fachlich nachvollziehbaren Storno-Grund an.' },
        { status: 400 }
      );
    }

    const actor = email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        })
      : null;

    const reversal = await prisma.$transaction(async (tx) =>
      reversePlatformLedgerEntry({
        db: tx,
        entryId,
        reason,
        actorId: actor?.id ?? undefined,
        actorEmail: actor?.email ?? email ?? 'system:admin-finance',
        requestId: `ledger-reversal:${entryId}:${Date.now()}`,
      })
    );

    return NextResponse.json({
      ok: true,
      reversalEntryId: reversal.id,
      bookedAt: reversal.bookedAt,
    });
  } catch (error: any) {
    console.error('[FINANCE_REVERSAL] Failed to reverse ledger entry:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reverse ledger entry' },
      { status: 500 }
    );
  }
}
