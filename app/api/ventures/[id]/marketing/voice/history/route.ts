import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_CONFIG_ERROR = 'ELEVENLABS_NOT_CONFIGURED';
const isMissingElevenLabsKeyError = (error: unknown) =>
  error instanceof Error && error.message === 'ElevenLabs API Key fehlt';

const elevenLabsNotConfiguredResponse = () =>
  NextResponse.json(
    {
      error: 'Voice Provider ist nicht konfiguriert (ELEVENLABS_API_KEY fehlt).',
      code: ELEVENLABS_CONFIG_ERROR
    },
    { status: 503 }
  );

const elevenlabsRequest = async (path: string, options: RequestInit) => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API Key fehlt');
  }
  const res = await fetch(`${ELEVENLABS_API_URL}${path}`, {
    ...options,
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      ...(options.headers || {})
    }
  });
  return res;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (!ELEVENLABS_API_KEY) {
    return elevenLabsNotConfiguredResponse();
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

  const pageSize = request.nextUrl.searchParams.get('pageSize');
  const startAfter = request.nextUrl.searchParams.get('startAfter');

  const query = new URLSearchParams();
  if (pageSize) query.set('page_size', pageSize);
  if (startAfter) query.set('start_after_history_item_id', startAfter);

  const queryString = query.toString();
  const path = `/history${queryString ? `?${queryString}` : ''}`;

  try {
    const res = await elevenlabsRequest(path, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.detail || 'History konnte nicht geladen werden.' }, { status: 502 });
    }
    return NextResponse.json({ history: data });
  } catch (error: any) {
    if (isMissingElevenLabsKeyError(error)) {
      return elevenLabsNotConfiguredResponse();
    }
    console.error('ElevenLabs history fetch failed:', error);
    return NextResponse.json({ error: error.message || 'ElevenLabs API Fehler' }, { status: 500 });
  }
}
