import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET missing' }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const url = new URL('/api/cron/ai-news', origin);
  url.searchParams.set('force', '1');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      authorization: `Bearer ${cronSecret}`,
    },
    cache: 'no-store'
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Trigger failed' }, { status: res.status });
  }

  return NextResponse.json({ success: true, result: data });
}
