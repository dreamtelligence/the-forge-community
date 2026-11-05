import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';

type GenerationMode = 'text-to-video' | 'image-to-video' | 'references-to-video';
type VeoModelKey = 'veo-3.1' | 'veo-3.1-fast';

const MODE_LABELS: Record<GenerationMode, string> = {
  'text-to-video': 'Text to Video',
  'image-to-video': 'Image to Video',
  'references-to-video': 'Character References',
};

const parseCsv = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const venture = await prisma.venture.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 });
  }

  const models: Array<{ key: VeoModelKey; label: string }> = [
    { key: 'veo-3.1', label: 'Veo 3.1 (High Quality)' },
    { key: 'veo-3.1-fast', label: 'Veo 3.1 Fast' },
  ];

  const modes: Array<{
    id: GenerationMode;
    label: string;
  }> = [
    { id: 'text-to-video', label: MODE_LABELS['text-to-video'] },
    { id: 'image-to-video', label: MODE_LABELS['image-to-video'] },
    { id: 'references-to-video', label: MODE_LABELS['references-to-video'] },
  ];

  const aspectRatios = parseCsv(process.env.VEO_ASPECT_RATIOS, ['16:9', '9:16']);
  // google/veo-3.1 auf Replicate: 720p / 1080p
  const resolutions = parseCsv(process.env.VEO_RESOLUTIONS, ['720p', '1080p']).filter((value) =>
    ['720p', '1080p'].includes(value)
  );
  const durationOptions = [4, 6, 8];

  return NextResponse.json({
    defaults: {
      model: 'veo-3.1-fast',
      aspectRatio: '16:9',
      resolution: '720p',
      durationSeconds: 8,
      generateAudio: true,
    },
    models,
    modes,
    aspectRatios,
    resolutions,
    durationOptions,
    limits: {
      maxReferences: 3,
      maxImageBytes: 10 * 1024 * 1024,
    },
  });
}
