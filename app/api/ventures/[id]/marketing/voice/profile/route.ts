import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await prisma.venture.findFirst({
    where: { id, ownerId: user.id }
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const voiceProfile = (prisma as any).voiceProfile;
  if (!voiceProfile) {
    return NextResponse.json({
      profile: null,
      warning: 'VoiceProfile model fehlt. Bitte Prisma migrate + generate ausführen.'
    });
  }

  const profile = await voiceProfile.findUnique({
    where: { ventureId: id }
  });

  return NextResponse.json({ profile });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await prisma.venture.findFirst({
    where: { id, ownerId: user.id }
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const data = {
    voiceId: typeof payload?.voiceId === 'string' ? payload.voiceId.trim() : null,
    voiceName: typeof payload?.voiceName === 'string' ? payload.voiceName.trim() : null,
    modelId: typeof payload?.modelId === 'string' ? payload.modelId.trim() : null,
    pronunciationDictionaryId: typeof payload?.pronunciationDictionaryId === 'string'
      ? payload.pronunciationDictionaryId.trim()
      : null,
    pronunciationDictionaryVersionId: typeof payload?.pronunciationDictionaryVersionId === 'string'
      ? payload.pronunciationDictionaryVersionId.trim()
      : null,
    voiceSettings: payload?.voiceSettings && typeof payload.voiceSettings === 'object'
      ? payload.voiceSettings
      : null,
  };

  const voiceProfile = (prisma as any).voiceProfile;
  if (!voiceProfile) {
    return NextResponse.json({
      error: 'VoiceProfile model fehlt. Bitte Prisma migrate + generate ausführen.'
    }, { status: 503 });
  }

  const profile = await voiceProfile.upsert({
    where: { ventureId: id },
    update: data,
    create: {
      ventureId: id,
      ...data
    }
  });

  return NextResponse.json({ profile });
}
