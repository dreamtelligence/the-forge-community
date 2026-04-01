import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { callAI } from '@/lib/ai';
import { updateVentureProgress } from '@/lib/ventures';
import { calculateTokenCredits, estimateTokens, InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/energy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { contentType, topic, additionalInstructions } = await req.json();

    if (!contentType || !topic) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const parsePositiveInt = (value: string | undefined, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
    };

    // Verify access to venture and get BrandDNA
    const venture = await prisma.venture.findFirst({
      where: {
        id: id,
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
      include: {
        brandDNA: true
      }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
    }

    const brandDNA = venture.brandDNA;
    const brandContext = brandDNA ? `
    MARKEN-KONTEXT:
    - Markenname: ${brandDNA.brandName}
    - Mission: ${brandDNA.mission || 'Nicht definiert'}
    - Tonfall: ${brandDNA.toneOfVoice || 'Professionell'}
    - Zielgruppe: ${brandDNA.customerPersona || 'Nicht definiert'}
    - Schreibstil: ${brandDNA.writingStyle || 'Klar und direkt'}
    - Spezielle Anweisungen: ${brandDNA.aiContext || 'Keine'}
    - Zu vermeiden: ${brandDNA.doNotMention?.join(', ') || 'Nichts'}
    ` : 'Kein spezifischer Marken-Kontext vorhanden. Nutze einen professionellen, modernen Startup-Stil.';

    const systemPrompt = `
    Du bist ein erfahrener Marketing-Copywriter für das Startup "${venture.name}".
    Deine Aufgabe ist es, hochwertigen Marketing-Content zu erstellen, der perfekt zur Markenidentität passt.

    ${brandContext}

    FORMATIERUNG:
    - Nutze Markdown für Fettgedrucktes, Listen, etc.
    - Sei kreativ aber authentisch.
    - Antworte IMMER auf Deutsch.
    `;

    const userPrompt = `
    Erstelle Content für: ${contentType}
    Thema: ${topic}
    Zusätzliche Anweisungen: ${additionalInstructions || 'Keine'}
    `;

    const maxTokens = parsePositiveInt(process.env.AI_MARKETING_MAX_TOKENS, 2000);
    const creditsPer1k = parsePositiveInt(
      process.env.AI_MARKETING_CREDITS_PER_1K_TOKENS || process.env.AI_CREDITS_PER_1K_TOKENS,
      2
    );
    const estimatedTokens = estimateTokens(`${systemPrompt}\n\n${userPrompt}`) + maxTokens;
    const estimatedCredits = calculateTokenCredits(estimatedTokens, creditsPer1k);

    let reservationId: string | null = null;
    let reservedCredits = estimatedCredits;
    try {
      const reservation = await reserveEnergy({
        userId: user.id,
        amount: estimatedCredits,
        feature: 'marketing.assistant',
        requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
        metadata: {
          ventureId: id,
          contentType,
          topic,
          promptTokensEstimate: estimatedTokens,
          maxTokens
        }
      });
      reservationId = reservation.reservationId;
      reservedCredits = reservation.reservedCredits;
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

    let aiResponse;
    try {
      aiResponse = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens });
    } catch (error) {
      if (reservationId) {
        await refundEnergy(reservationId, 'ai-failed');
      }
      throw error;
    }

    if (aiResponse.error) {
      if (reservationId) {
        await refundEnergy(reservationId, 'ai-error');
      }
       throw new Error(aiResponse.error);
    }

    // Save to database & Deduct Credits
    try {
      await prisma.$transaction([
        prisma.marketingContent.create({
          data: {
            ventureId: id,
            contentType,
            prompt: userPrompt,
            generatedContent: aiResponse.content,
            createdById: user.id
          }
        })
      ]);
    } catch (error) {
      if (reservationId) {
        await refundEnergy(reservationId, 'marketing-save-failed');
      }
      throw error;
    }

    const promptTokens = aiResponse.usage?.promptTokens ?? estimateTokens(`${systemPrompt}\n\n${userPrompt}`);
    const completionTokens = aiResponse.usage?.completionTokens ?? estimateTokens(aiResponse.content);
    const totalTokens = aiResponse.usage?.totalTokens ?? (promptTokens + completionTokens);
    const finalCredits = calculateTokenCredits(totalTokens, creditsPer1k);
    const settled = reservationId
      ? await settleEnergy({
          reservationId,
          finalCost: finalCredits,
          provider: aiResponse.provider,
          model: aiResponse.model,
          usage: { promptTokens, completionTokens, totalTokens },
          metadata: {
            reservedCredits,
            ventureId: id,
            contentType,
            topic,
          }
        })
      : null;

    await updateVentureProgress(id);

    return NextResponse.json({ 
      content: aiResponse.content,
      provider: aiResponse.provider,
      creditsUsed: finalCredits,
      creditsRemaining: settled?.creditsRemaining ?? null
    });

  } catch (error) {
    console.error('Marketing generation failed:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
