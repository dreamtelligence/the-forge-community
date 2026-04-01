import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { grantEnergy } from '@/lib/energy';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  });

  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';
  const rawAmount = Number(body?.amount ?? 0);
  const reason = typeof body?.reason === 'string' && body.reason.trim()
    ? body.reason.trim()
    : 'admin-topup';

  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const targetEmail = rawEmail || session.user.email;
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, email: true, credits: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const result = await grantEnergy(user.id, rawAmount, reason);

  return NextResponse.json({
    email: user.email,
    creditsRemaining: result.creditsRemaining
  });
}
