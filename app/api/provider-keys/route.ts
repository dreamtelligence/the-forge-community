import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  REPLICATE_PROVIDER,
  getReplicateKeyStatusForUser,
  upsertReplicateKeyForUser,
  removeReplicateKeyForUser,
} from '@/lib/provider-keys';
import { RateLimiters } from '@/lib/rate-limit';

const PROVIDER_NOT_SUPPORTED_ERROR = 'Nur Replicate wird aktuell für BYOK unterstützt.';

async function getAuthenticatedUserId() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const status = await getReplicateKeyStatusForUser(userId);
  return NextResponse.json({
    providers: [status],
  });
}

export async function PUT(request: NextRequest) {
  const rateLimited = await RateLimiters.auth(request);
  if (rateLimited) return rateLimited;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const provider = typeof body?.provider === 'string' ? body.provider.trim().toLowerCase() : '';
  const token = typeof body?.token === 'string' ? body.token : '';

  if (provider !== REPLICATE_PROVIDER) {
    return NextResponse.json({ error: PROVIDER_NOT_SUPPORTED_ERROR }, { status: 400 });
  }

  try {
    const status = await upsertReplicateKeyForUser(userId, token);
    return NextResponse.json({
      ok: true,
      provider: status,
      message: 'Replicate Key gespeichert.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Key konnte nicht gespeichert werden.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimited = await RateLimiters.auth(request);
  if (rateLimited) return rateLimited;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get('provider')?.trim().toLowerCase() || REPLICATE_PROVIDER;
  if (provider !== REPLICATE_PROVIDER) {
    return NextResponse.json({ error: PROVIDER_NOT_SUPPORTED_ERROR }, { status: 400 });
  }

  const status = await removeReplicateKeyForUser(userId);
  return NextResponse.json({
    ok: true,
    provider: status,
    message: 'Replicate Key entfernt.',
  });
}
