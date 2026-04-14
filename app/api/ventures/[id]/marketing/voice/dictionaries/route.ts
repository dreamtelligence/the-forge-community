import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_CONFIG_ERROR = 'ELEVENLABS_NOT_CONFIGURED';

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');
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

const buildPls = (rules: { text: string; alias: string }[]) => {
  const body = rules
    .map((rule) => {
      const word = rule.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const alias = rule.alias.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `  <lexeme>\n    <grapheme>${word}</grapheme>\n    <alias>${alias}</alias>\n  </lexeme>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<lexicon version="1.0" xmlns="http://www.w3.org/2005/01/pronunciation-lexicon" alphabet="ipa" xml:lang="de-DE">\n${body}\n</lexicon>`;
};

export async function GET(
  _req: NextRequest,
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

  try {
    const res = await elevenlabsRequest('/pronunciation-dictionaries', { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.detail || 'Dictionaries konnten nicht geladen werden.' }, { status: 502 });
    }
    return NextResponse.json({ dictionaries: data?.pronunciation_dictionaries ?? data ?? [] });
  } catch (error: any) {
    if (isMissingElevenLabsKeyError(error)) {
      return elevenLabsNotConfiguredResponse();
    }
    console.error('ElevenLabs dictionaries fetch failed:', error);
    return NextResponse.json({ error: error.message || 'ElevenLabs API Fehler' }, { status: 500 });
  }
}

export async function POST(
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

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request' }, { status: 400 });
  }

  const rules = Array.isArray(payload?.rules)
    ? payload.rules
        .map((rule: any) => ({
          text: typeof rule?.text === 'string' ? rule.text.trim() : '',
          alias: typeof rule?.alias === 'string' ? rule.alias.trim() : ''
        }))
        .filter((rule: { text: string; alias: string }) => rule.text && rule.alias)
    : [];

  if (!rules.length) {
    return NextResponse.json({ error: 'Keine gültigen Regeln gefunden.' }, { status: 400 });
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

  try {
    const pls = buildPls(rules);
    const form = new FormData();
    const name = typeof payload?.name === 'string' ? payload.name.trim() : `${venture.name || 'Brand'} Dictionary`;
    const description = typeof payload?.description === 'string' ? payload.description.trim() : undefined;
    const filename = `${sanitizeFilename(name)}.pls`;

    form.append('file', new Blob([pls], { type: 'application/xml' }), filename);
    form.append('name', name);
    if (description) form.append('description', description);

    const res = await elevenlabsRequest('/pronunciation-dictionaries/add-from-file', {
      method: 'POST',
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.detail || 'Dictionary konnte nicht erstellt werden.' }, { status: 502 });
    }

    return NextResponse.json({ dictionary: data });
  } catch (error: any) {
    if (isMissingElevenLabsKeyError(error)) {
      return elevenLabsNotConfiguredResponse();
    }
    console.error('ElevenLabs dictionary create failed:', error);
    return NextResponse.json({ error: error.message || 'ElevenLabs API Fehler' }, { status: 500 });
  }
}
