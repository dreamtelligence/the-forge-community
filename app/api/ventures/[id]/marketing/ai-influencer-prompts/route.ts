import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { callGeminiDirect } from '@/lib/ai';
import { InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/finance/energy';

const CONTENT_TYPE = 'ai-influencer-prompt';

const SYSTEM_PROMPT = `You are the ultimate AI image prompt generator for Midjourney, Leonardo AI, and Freepik, specializing in photorealistic and cinematic "podcast studio" images. You will ask the user for only one thing: the subject(s) they want to see. Do NOT request additional details such as lighting, style, scene composition, or meta tokens — you must infer all of those yourself. When the subject is provided, instantly generate 5 highly detailed, ready-to-use prompts in different cinematic and photographic styles, each containing: - Full subject description with inferred emotions, poses, wardrobe, and micro-details - Realistic studio setting with props, furniture, and environmental storytelling - Professional camera & lens combinations (e.g., Leica SL2 + 75mm Noctilux, ARRI Alexa 65 + Panavision Primo, Hasselblad H6D 100c + 85mm f/1.2) - Advanced lighting setups (e.g., chiaroscuro, split-tone teal/amber, soft key with rim light, volumetric haze) - Depth-of-field and bokeh descriptions - Color grading style matching the mood (e.g., Netflix docu-grade, HBO prestige drama, vibrant editorial, vintage Kodak film, ultra-crisp advertising) - Hidden realism tokens for authenticity: IMG_9854.CR2, IMG_2985.HEIC, C0001.R3D, stills archive, editorial_stills_archive, uncompressed RAW still, cinematic_color_grade, organic film grain, perfect exposure - Scene-specific cinematic imperfections (dust motes, lens breathing, light bloom, slight motion blur for realism) The 5 default styles you will always provide in the first response: 1. Netflix Original Documentary Style – Clean cinematic docu look, teal/amber grading, premium lighting 2. HBO Prestige Drama Style – Darker, moodier, high-contrast chiaroscuro tone 3. Vibrant Editorial Style – High saturation, bright lighting, crisp detail like a magazine cover 4. Vintage 35mm Film Style – Kodak Portra 400 look, warm tones, natural grain 5. Ultra-Crisp Commercial Advertising Style – High-key lighting, pin-sharp detail, polished for marketing Format each prompt as a single paragraph, no brackets or placeholders. After providing the first 5 prompts, always ask: "Would you like me to generate more unique styles for this same subject?" The only thing the user ever needs to give you is the short subject description.`;

const parseCredits = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback;
};

const COST = parseCredits(process.env.MARKETING_INFLUENCER_PROMPT_CREDITS, 6);

const selectUser = { id: true } as const;

const findVentureForUser = async (ventureId: string, userId: string) => {
  return prisma.venture.findFirst({
    where: {
      id: ventureId,
      OR: [
        { ownerId: userId },
        {
          squad: {
            members: {
              some: { userId, leftAt: null }
            }
          }
        }
      ]
    },
    select: { id: true, name: true }
  });
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id: ventureId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: selectUser
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await findVentureForUser(ventureId, user.id);
  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const prompts = await prisma.marketingContent.findMany({
    where: { ventureId, contentType: CONTENT_TYPE },
    orderBy: { createdAt: 'desc' },
    select: { id: true, prompt: true, generatedContent: true, createdAt: true }
  });

  return NextResponse.json({ prompts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id: ventureId } = await params;
  const body = await req.json().catch(() => ({}));
  const subject = String(body?.subject ?? '').trim();

  if (!subject) {
    return NextResponse.json({ error: 'Bitte gib ein Subject an.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: selectUser
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await findVentureForUser(ventureId, user.id);
  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  let reservationId: string | null = null;
  try {
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: COST,
      feature: 'marketing.ai-influencer-prompt',
      requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
      metadata: { ventureId, subject }
    });
    reservationId = reservation.reservationId;
  } catch (error) {
    if (error instanceof InsufficientEnergyError) {
      return NextResponse.json({
        error: error.message,
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: error.requiredCredits,
        creditsAvailable: error.creditsAvailable
      }, { status: 402 });
    }
    throw error;
  }

  try {
    const normalizePromptSet = (raw: string) => {
      const content = String(raw || '').trim();
      if (!content) return { ok: false as const, content: '' };

      // Accept either numbered prompts or paragraph-separated prompts.
      // Goal: exactly 5 prompts.
      const numbered = content
        .split(/\n(?=\s*\d+\s*[\.)])/g)
        .map((s) => s.trim())
        .filter(Boolean);

      const paragraphs = content
        .split(/\n\s*\n+/g)
        .map((s) => s.trim())
        .filter(Boolean);

      const candidates = numbered.length >= 5 ? numbered : paragraphs;
      if (candidates.length < 5) return { ok: false as const, content };

      const firstFive = candidates.slice(0, 5);
      // Remove leading numbering like "1." / "1)"
      const cleaned = firstFive
        .map((p) => p.replace(/^\s*\d+\s*[\.)]\s*/g, '').trim())
        .filter(Boolean);

      if (cleaned.length !== 5) return { ok: false as const, content };
      // Store as 5 single-paragraph prompts separated by blank lines.
      return { ok: true as const, content: cleaned.join('\n\n') };
    };

    const runGemini = async (mode: 'primary' | 'repair', draft?: string) => {
      const repairHint = mode === 'repair'
        ? `\n\nThe previous output did not follow the required format. Reformat and fix it.\n\nSUBJECT: ${subject}\n\nPREVIOUS_OUTPUT:\n${draft || ''}`
        : '';

      return callGeminiDirect(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${subject}${repairHint}` },
        ],
        { temperature: 0.7, maxTokens: 1400 }
      );
    };

    // 1) Primary generation
    const aiResponse = await runGemini('primary');

    if (aiResponse.error) {
      throw new Error(aiResponse.error);
    }

    const normalized1 = normalizePromptSet(aiResponse.content);

    // 2) Optional single repair pass if not exactly 5 prompts
    const finalContent = normalized1.ok
      ? normalized1.content
      : (() => {
          return null;
        })();

    let content = finalContent;
    let usage = aiResponse.usage;
    let provider = aiResponse.provider;
    let model = aiResponse.model;

    if (!content) {
      const repaired = await runGemini('repair', normalized1.content);
      if (repaired.error) {
        throw new Error(repaired.error);
      }
      const normalized2 = normalizePromptSet(repaired.content);
      if (!normalized2.ok) {
        throw new Error('Gemini Output konnte nicht in 5 Prompts normalisiert werden.');
      }
      content = normalized2.content;
      usage = repaired.usage;
      provider = repaired.provider;
      model = repaired.model;
    }

    const created = await prisma.marketingContent.create({
      data: {
        ventureId,
        contentType: CONTENT_TYPE,
        prompt: subject,
        generatedContent: content,
        createdById: user.id
      },
      select: { id: true, prompt: true, generatedContent: true, createdAt: true }
    });

    const settlement = reservationId
      ? await settleEnergy({
          reservationId,
          finalCost: COST,
          provider,
          model,
          usage,
          metadata: { ventureId, subject }
        })
      : null;

    return NextResponse.json({
      prompt: created,
      provider,
      creditsUsed: COST,
      creditsRemaining: settlement?.creditsRemaining ?? null
    });
  } catch (error) {
    if (reservationId) {
      await refundEnergy(reservationId, 'ai-influencer-prompt-failed');
    }
    const message = error instanceof Error ? error.message : 'Interner Serverfehler';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id: ventureId } = await params;
  const body = await req.json().catch(() => ({}));
  const promptId = String(body?.id ?? '').trim();

  if (!promptId) {
    return NextResponse.json({ error: 'Fehlende Prompt-ID.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: selectUser
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await findVentureForUser(ventureId, user.id);
  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  await prisma.marketingContent.deleteMany({
    where: {
      id: promptId,
      ventureId,
      contentType: CONTENT_TYPE,
      createdById: user.id
    }
  });

  return NextResponse.json({ success: true });
}
