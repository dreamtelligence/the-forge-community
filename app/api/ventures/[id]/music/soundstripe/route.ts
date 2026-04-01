import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const SOUNDSTRIPE_API_URL = process.env.SOUNDSTRIPE_API_URL || 'https://api.soundstripe.com/v1';
const SOUNDSTRIPE_API_KEY = process.env.SOUNDSTRIPE_API_KEY;

const clampInt = (value: string | null, fallback: number, min = 1, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const toString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getDuration = (value: unknown) => {
  const duration = toNumber(value);
  if (!duration) return undefined;
  return duration > 1000 ? duration / 1000 : duration;
};

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
};

const flattenTags = (value: unknown) => {
  if (!value) return [] as string[];
  if (Array.isArray(value)) {
    return value.filter((tag) => typeof tag === 'string');
  }
  if (typeof value === 'object') {
    const tags: string[] = [];
    for (const entry of Object.values(value as Record<string, unknown>)) {
      if (Array.isArray(entry)) {
        tags.push(...entry.filter((tag) => typeof tag === 'string'));
      }
    }
    return tags;
  }
  return [] as string[];
};

const mapSongs = (payload: any) => {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const included = Array.isArray(payload?.included) ? payload.included : [];

  const audioFileById = new Map<string, any>();
  const artistById = new Map<string, any>();

  for (const item of included) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'audio_files') {
      audioFileById.set(item.id, item);
    } else if (item.type === 'artists') {
      artistById.set(item.id, item);
    }
  }

  return data.map((song: any) => {
    const attributes = song?.attributes || {};
    const relationships = song?.relationships || {};

    const artistRel = relationships?.artists?.data;
    const artistId = Array.isArray(artistRel) ? artistRel[0]?.id : artistRel?.id;
    const artist = artistId ? artistById.get(artistId) : undefined;

    const audioRel = relationships?.audio_files?.data;
    const audioId = Array.isArray(audioRel) ? audioRel[0]?.id : audioRel?.id;
    const audioFile = audioId ? audioFileById.get(audioId) : undefined;
    const audioAttrs = audioFile?.attributes || {};

    const versions = audioAttrs?.versions || {};
    const previewUrl = pickFirstString(
      versions?.mp3,
      versions?.preview_mp3,
      audioAttrs?.preview_url,
      audioAttrs?.previewUrl,
      attributes?.preview_url,
      attributes?.previewUrl
    );

    return {
      id: song?.id,
      type: 'song',
      title: pickFirstString(attributes?.title, attributes?.name) || 'Untitled',
      artist: pickFirstString(artist?.attributes?.name),
      bpm: toNumber(attributes?.bpm),
      duration: getDuration(audioAttrs?.duration ?? attributes?.duration),
      tags: flattenTags(attributes?.tags),
      description: pickFirstString(attributes?.description),
      previewUrl,
    };
  });
};

const mapSoundEffects = (payload: any) => {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.map((sfx: any) => {
    const attributes = sfx?.attributes || {};
    const versions = attributes?.versions || {};
    const previewUrl = pickFirstString(
      versions?.mp3,
      versions?.preview_mp3,
      attributes?.preview_url,
      attributes?.previewUrl
    );

    return {
      id: sfx?.id,
      type: 'sound_effect',
      title: pickFirstString(attributes?.title, attributes?.name) || 'Untitled',
      duration: getDuration(attributes?.duration),
      tags: flattenTags(attributes?.tags),
      description: pickFirstString(attributes?.description),
      previewUrl,
      category: pickFirstString(attributes?.primary_category),
      subcategory: pickFirstString(attributes?.primary_subcategory),
    };
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const venture = await prisma.venture.findFirst({
      where: {
        id,
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
      select: { id: true }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
    }

    if (!SOUNDSTRIPE_API_KEY) {
      return NextResponse.json({ error: 'Soundstripe API Key fehlt' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rawType = searchParams.get('type') || 'songs';
    const resource = rawType === 'sfx' || rawType === 'sound_effects' ? 'sound_effects' : 'songs';
    const page = clampInt(searchParams.get('page'), 1, 1, 100);
    const size = clampInt(searchParams.get('size'), 12, 6, 36);
    const query = searchParams.get('q')?.trim();

    const buildUrl = (useSearch: boolean) => {
      const apiUrl = new URL(`${SOUNDSTRIPE_API_URL}/${resource}`);
      apiUrl.searchParams.set('page[size]', String(size));
      apiUrl.searchParams.set('page[number]', String(page));
      if (resource === 'songs') {
        apiUrl.searchParams.set('include', 'artists,audio_files');
      }
      if (useSearch && query) {
        apiUrl.searchParams.set('filter[search]', query);
      }
      return apiUrl;
    };

    let usedSearch = Boolean(query);
    let apiUrl = buildUrl(usedSearch);

    let res = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Token ${SOUNDSTRIPE_API_KEY}`,
        Accept: 'application/vnd.api+json'
      }
    });

    if (!res.ok && usedSearch) {
      usedSearch = false;
      apiUrl = buildUrl(false);
      res = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Token ${SOUNDSTRIPE_API_KEY}`,
          Accept: 'application/vnd.api+json'
        }
      });
    }

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail = toString(payload?.error) || toString(payload?.detail) || 'Soundstripe API Fehler';
      return NextResponse.json({ error: detail, providerStatus: res.status }, { status: 502 });
    }

    const items = resource === 'songs' ? mapSongs(payload) : mapSoundEffects(payload);
    const total = toNumber(payload?.links?.meta?.total_count ?? payload?.meta?.total);

    return NextResponse.json({
      items,
      meta: {
        page,
        size,
        total
      },
      queryApplied: usedSearch
    });
  } catch (error: any) {
    console.error('Soundstripe API error:', error);
    return NextResponse.json({ error: error.message || 'Soundstripe API Fehler' }, { status: 500 });
  }
}
