import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { callAI } from '@/lib/ai';
import { callGeminiWithTools } from '@/lib/ai/gemini-tools';
import { getForgePromptContext } from '@/lib/ai/knowledge';
import { calculateTokenCredits, estimateTokens, InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/finance/energy';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';
import { braveSearch } from '@/lib/ai/research-core';
import { listPendingActions } from '@/lib/ai/actions';
import { executeOrionToolCall } from '@/lib/ai/orion-tools';
// personal-studio ventures are excluded via isPersonalStudio flag

const IMAGE_ANALYSIS_PROMPT = `Analysiere das Bild und liefere einen kompakten Prompt, mit dem man es in einem Text-zu-Bild-Model rekonstruieren kann.\n\nAnforderungen:\n- Beschreibe Motiv, Stil, Farben, Licht, Komposition, Kameraperspektive.\n- Keine sensiblen Attribute raten (Ethnie, Religion, Identitaet).\n- Ausgabe: 1-2 Sätze, keine Aufzählung, keine Anführungszeichen.\n\nWenn der User explizit nach etwas fragt, berücksichtige es.`;

const PDF_SUMMARY_PROMPT = `Fasse das PDF kurz zusammen.\n\nAnforderungen:\n- 5-8 Bullet-Points.\n- Hebe wichtige Zahlen, Deadlines, Verpflichtungen hervor.\n- Wenn der User eine konkrete Frage stellt, beantworte sie basierend auf dem PDF.\n\nAntwort als Markdown mit Bullet-Points.`;

const VIDEO_ANALYSIS_PROMPT = `Analysiere das Video detailliert für eine Rekonstruktion.\n\nAspekte:\n- Shot Type (Close-up, Wide, Dolly, Pan)\n- Kamera & Licht (Cinematic, Natural, Neon, Dark)\n- Mood & Atmosphäre\n- Handlung & Pacing\n- Stil & Ästhetik\n- Sound-Design (impliziert)\n\nOutput Format:\n1. **Video-Zusammenfassung** (2-3 Sätze)\n2. **Rekonstruktions-Prompt** (Detaillierter Prompt für Text-to-Video Modelle)\n3. **Optimierter Veo-Prompt** (Spezifisch für Google Veo: 9:16, 5-8s, photorealistisch, englisch)`;

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const GEMINI_IMAGE_API_VERSION = process.env.GEMINI_IMAGE_API_VERSION || process.env.GEMINI_API_VERSION || 'v1beta';
const GEMINI_DOC_MODEL = process.env.GEMINI_DOC_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const GEMINI_DOC_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';
const GEMINI_VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL || 'gemini-2.0-flash-exp'; // Video capable model

const isImageAttachment = (item: any) => {
  const type = String(item?.type || '').toLowerCase();
  const name = String(item?.name || '').toLowerCase();
  return (
    type.startsWith('image/') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif')
  );
};

const isVideoAttachment = (item: any) => {
  const type = String(item?.type || '').toLowerCase();
  const name = String(item?.name || '').toLowerCase();
  return (
    type.startsWith('video/') ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.webm')
  );
};

const isPdfAttachment = (item: any) => {
  const type = String(item?.type || '').toLowerCase();
  const name = String(item?.name || '').toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
};

const parseConfirmationIntent = (text: string) => {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, '');
  if (!cleaned) return null;

  const indexed = cleaned.match(/^(bestatige|bestätige|confirm|ja|ok|okay|klar|mach|mach es|bitte|jawohl|jup|jo|yep|yes)\s+(\d+)$/);
  if (indexed) {
    return { intent: 'confirm' as const, index: Number(indexed[2]) };
  }

  const indexedCancel = cleaned.match(/^(abbrechen|cancel|stopp|stop|nein|no)\s+(\d+)$/);
  if (indexedCancel) {
    return { intent: 'cancel' as const, index: Number(indexedCancel[2]) };
  }

  if (/^(ja|yes|ok|okay|klar|mach|mach es|bitte|jawohl|jup|jo|yep|go)$/.test(cleaned)) {
    return { intent: 'confirm' as const };
  }

  if (/^(nein|no|stop|stopp|abbrechen|cancel)$/.test(cleaned)) {
    return { intent: 'cancel' as const };
  }

  return null;
};

const fetchAttachmentBuffer = async (url: string, maxBytes = 10 * 1024 * 1024) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Attachment fetch failed');
  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error('Attachment too large');
  }
  return Buffer.from(arrayBuffer);
};

/**
 * Kimi K2.5 Inline Call (Multimodal - Images & Videos)
 * Primary provider for image/video analysis
 */
const callKimiInline = async (textPrompt: string, imageBase64?: string, mimeType?: string) => {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) throw new Error('MOONSHOT_API_KEY missing');

  const content: any[] = [{ type: 'text', text: textPrompt }];

  if (imageBase64 && mimeType) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`
      }
    });
  }

  const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kimi-k2.5',
      messages: [{ role: 'user', content }],
      temperature: 0.2,
      max_tokens: 800,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kimi K2.5 API error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

/**
 * Gemini Inline Call (Fallback for images)
 */
const callGeminiInline = async (model: string, apiVersion: string, parts: any[]) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        }
      })
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text).filter(Boolean).join(' ').trim();
  return text || '';
};

export async function POST(req: NextRequest) {
  const rateLimitResponse = await RateLimiters.aiChatbot(req);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { message, context, pathname, ventureId: bodyVentureId, attachments, threadId } = await req.json();
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Nachricht fehlt' }, { status: 400 });
    }

    const forgeKnowledge = getForgePromptContext();
    const normalizedMessage = message.trim();
    const researchMatch = normalizedMessage.match(/^\s*(\/research|research:|recherche:)\s*(.*)$/i);
    const wantsResearch = Boolean(researchMatch);
    const researchQuery = wantsResearch ? (researchMatch?.[2] || '').trim() : '';
    const userMessage = wantsResearch ? researchQuery : normalizedMessage;
    if (wantsResearch && !userMessage) {
      return NextResponse.json({ error: 'Bitte gib eine Recherche-Frage an.' }, { status: 400 });
    }

    const ventureId =
      bodyVentureId ||
      (typeof pathname === 'string' ? pathname.match(/^\/forge\/([^/?#]+)/i)?.[1] : null);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        skills: true,
        goal: true,
        founderNumber: true,
        addressCountry: true,
        linkedin: true,
        instagram: true
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const limitText = (value: string, max = 280) =>
      value.length > max ? `${value.slice(0, max).trim()}…` : value;
    const parsePositiveInt = (value: string | undefined, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
    };

    // Fetch all user ventures for global context
    const allUserVentures = await prisma.venture.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { squad: { members: { some: { userId: user.id, leftAt: null } } } }
        ],
        isPersonalStudio: false,
      },
      select: {
        id: true,
        name: true,
        status: true,
        type: true
      }
    });

    const isSupplierQuery = (text: string) => /(supplier|suppliers|lieferant|lieferanten|händler|haendler|b2b)/i.test(text);
    const extractSupplierQuery = (text: string) => {
      const matchQuoted = text.match(/["“”']([^"“”']+)["“”']/);
      if (matchQuoted) return matchQuoted[1].trim();
      const stopwords = new Set([
        'haben', 'habt', 'wir', 'ihr', 'es', 'gibt', 'bitte', 'liste', 'listen',
        'zeig', 'zeige', 'suchen', 'suche', 'such', 'find', 'finde', 'welche',
        'which', 'do', 'we', 'have', 'supplier', 'suppliers', 'lieferant', 'lieferanten',
        'händler', 'haendler', 'b2b', 'die', 'der', 'das', 'von', 'für', 'mit', 'und', 'ein', 'eine', 'the', 'a', 'an'
      ]);
      const cleaned = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => !stopwords.has(token))
        .join(' ')
        .trim();
      return cleaned.length ? cleaned : undefined;
    };

    if (!wantsResearch && isSupplierQuery(userMessage)) {
      const supplierQuery = extractSupplierQuery(userMessage);
      const tokens = supplierQuery ? supplierQuery.split(/\s+/).filter(Boolean) : [];
      const orParts: any[] = supplierQuery
        ? [
            { title: { contains: supplierQuery, mode: 'insensitive' } },
            { description: { contains: supplierQuery, mode: 'insensitive' } },
            { type: { contains: supplierQuery, mode: 'insensitive' } },
            { location: { contains: supplierQuery, mode: 'insensitive' } },
          ]
        : [];
      if (tokens.length > 0) {
        orParts.push({ tags: { hasSome: tokens } });
      }

      const resources = await prisma.resource.findMany({
        where: {
          category: 'B2B_DIRECTORY',
          ...(orParts.length > 0 ? { OR: orParts } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      });

      if (resources.length === 0) {
        return NextResponse.json({
          response: supplierQuery
            ? `Im B2B‑Katalog finde ich nichts zu "${supplierQuery}". Soll ich breiter suchen (z.B. nur "food")?`
            : 'Im B2B‑Katalog finde ich dazu nichts. Soll ich die Liste ohne Filter zeigen?'
        });
      }

      const lines = resources.map((item: any) => {
        const parts = [
          item.title,
          item.type ? `(${item.type})` : null,
          item.location ? `• ${item.location}` : null,
          item.url ? `• ${item.url}` : null,
        ].filter(Boolean);
        return `- ${parts.join(' ')}`.trim();
      });

      return NextResponse.json({
        response: `Im B2B‑Katalog gefunden:\n${lines.join('\n')}\n\nSoll ich die Liste weiter filtern (Land/Typ) oder Details zu einem Eintrag zeigen?`
      });
    }

    const confirmationIntent = parseConfirmationIntent(normalizedMessage);
    if (confirmationIntent) {
      const pending = await listPendingActions(user.id, 5);
      if (pending.length > 0) {
        let targetAction = pending[0];
        if (confirmationIntent.index) {
          const idx = confirmationIntent.index - 1;
          if (idx >= 0 && idx < pending.length) {
            targetAction = pending[idx];
          }
        }

        if (confirmationIntent.index && targetAction !== pending[confirmationIntent.index - 1]) {
          return NextResponse.json({
            response: 'Die angegebene Nummer passt zu keiner offenen Aktion.'
          });
        }

        if (!confirmationIntent.index && pending.length > 1) {
          const lines = pending.map((action, i) =>
            `${i + 1}. ${action.summary || action.toolName} (${new Date(action.createdAt).toLocaleString('de-DE')})`
          );
          return NextResponse.json({
            response: `Ich habe mehrere offene Aktionen:\n${lines.join('\n')}\nBitte sag z.B. "Bestätige 1" oder "Abbrechen 2".`
          });
        }

        const toolResult = await executeOrionToolCall(
          {
            name: confirmationIntent.intent === 'confirm' ? 'confirm_action' : 'cancel_action',
            args: { confirmationToken: targetAction.confirmationToken }
          },
          {
            user: {
              id: user.id,
              name: user.name ?? null,
              email: user.email,
              role: user.role,
              founderNumber: user.founderNumber ?? null
            },
            ventures: allUserVentures.map((venture) => ({ id: venture.id, name: venture.name })),
            activeVentureId: ventureId ?? null,
            requestText: userMessage
          }
        );

        if (toolResult?.ok) {
          const actionSummary = targetAction.summary || targetAction.toolName;
          const details =
            toolResult?.result?.venture?.name
              ? ` Ergebnis: Venture "${toolResult.result.venture.name}" erstellt.`
              : '';
          const verb = confirmationIntent.intent === 'confirm' ? 'bestätigt und ausgeführt' : 'abgebrochen';
          return NextResponse.json({
            response: `Aktion ${verb}: ${actionSummary}.${details}`.trim()
          });
        }

        return NextResponse.json({
          response: toolResult?.error || 'Aktion konnte nicht ausgeführt werden.'
        });
      }
      return NextResponse.json({
        response: 'Es gibt aktuell keine offene Aktion zur Bestätigung. Sag mir bitte kurz, was ich anlegen oder ändern soll.'
      });
    }

    const userContext = `
USER_PROFIL (Global):
- Name: ${user.name || 'Unbekannt'}
- Email: ${user.email}
- Rolle: ${user.role} (Founder #${user.founderNumber})
- Land: ${user.addressCountry || 'n/a'}
- Bio: ${user.bio ? limitText(user.bio, 300) : 'n/a'}
- Ziel: ${user.goal ? limitText(user.goal, 200) : 'n/a'}
- Skills: ${user.skills.length > 0 ? user.skills.join(', ') : 'n/a'}
- Socials: ${[user.linkedin, user.instagram].filter(Boolean).join(', ') || 'n/a'}

MEINE VENTURES (Übersicht):
${allUserVentures.length > 0 
  ? allUserVentures.map(v => `- ${v.name} (${v.type}, ${v.status})`).join('\n') 
  : '- Keine Ventures bisher.'}
`.trim();

    let ventureContext = '';
    if (user?.id && ventureId) {
      const venture = await prisma.venture.findFirst({
        where: {
          id: ventureId,
          OR: [
            { ownerId: user.id },
            {
              squad: {
                members: {
                  some: { userId: user.id, leftAt: null },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
        currentPhase: true,
        type: true,

          productType: true,
          targetMarket: true,
          marketingBudget: true,
          totalBudget: true,
          brandDNA: {
            select: {
              brandName: true,
              tagline: true,
              mission: true,
              values: true,
              toneOfVoice: true,
              writingStyle: true,
              targetAudience: true,
              customerPersona: true,
              productCategory: true,
              keyFeatures: true,
              usp: true,
            },
          },
          squad: {
            select: {
              members: {
                where: { leftAt: null },
                select: { role: true },
              },
            },
          },
        },
      });

      if (venture) {
        const [openTasks, costsSum, recentCosts, campaignsCount] = await prisma.$transaction([
          prisma.ventureTask.findMany({
            where: { ventureId: venture.id, status: { not: 'DONE' } },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
            take: 5,
            select: { title: true, dueDate: true, status: true, priority: true },
          }),
          prisma.costItem.aggregate({
            where: { ventureId: venture.id },
            _sum: { amount: true },
          }),
          prisma.costItem.findMany({
            where: { ventureId: venture.id },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { category: true, name: true, amount: true, isRecurring: true },
          }),
          prisma.marketingCampaign.count({
            where: { ventureId: venture.id },
          }),
        ]);

        const roleCounts = (venture.squad?.members || []).reduce<Record<string, number>>((acc, member) => {
          const key = member.role;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const budgetParts = [
          venture.totalBudget ? `Gesamt: €${venture.totalBudget.toLocaleString()}` : null,
          venture.marketingBudget ? `Marketing: €${venture.marketingBudget.toLocaleString()}` : null,
        ].filter(Boolean);

        const taskLines = openTasks.length > 0
          ? openTasks
              .map((task) => {
                const due = task.dueDate ? `bis ${task.dueDate.toISOString().slice(0, 10)}` : 'ohne Datum';
                return `- ${limitText(task.title, 80)} (${task.status}, ${due})`;
              })
              .join('\n')
          : '- Keine offenen Aufgaben gefunden.';

        const costLines = recentCosts.length > 0
          ? recentCosts
              .map((cost) => {
                const recurring = cost.isRecurring ? ' (recurring)' : '';
                return `- ${cost.category}: €${cost.amount.toLocaleString()} • ${limitText(cost.name, 60)}${recurring}`;
              })
              .join('\n')
          : '- Keine Kosten erfasst.';

        const brandDNA = venture.brandDNA;
        const targetAudience = brandDNA?.targetAudience ? limitText(JSON.stringify(brandDNA.targetAudience), 200) : null;

        ventureContext = `
VENTURE-KONTEXT (Aktuell ausgewählt):
Name: ${venture.name}
Status: ${venture.status} (Phase ${venture.currentPhase})
Produkt: ${venture.productType || 'n/a'} • Markt: ${venture.targetMarket || 'n/a'}
Budget: ${budgetParts.length > 0 ? budgetParts.join(' | ') : 'nicht gesetzt'}
Kosten bisher: €${(costsSum._sum.amount || 0).toLocaleString()}
Letzte Kosten:
${costLines}
Offene Aufgaben (Top 5):
${taskLines}
Marketing: ${campaignsCount} Kampagne(n)
Squad: ${venture.squad?.members.length || 0} Mitglieder${
          Object.keys(roleCounts).length > 0
            ? ` (${Object.entries(roleCounts).map(([role, count]) => `${role}: ${count}`).join(', ')})`
            : ''
        }
Brand DNA:
- Name: ${brandDNA?.brandName || venture.name}
- Tagline: ${brandDNA?.tagline || 'n/a'}
- Mission: ${brandDNA?.mission || 'n/a'}
- Werte: ${(brandDNA?.values || []).join(', ') || 'n/a'}
- Tonalitaet: ${brandDNA?.toneOfVoice || 'n/a'} • Stil: ${brandDNA?.writingStyle || 'n/a'}
- Zielgruppe: ${targetAudience || brandDNA?.customerPersona || 'n/a'}
- Kategorie: ${brandDNA?.productCategory || 'n/a'}
- USP: ${brandDNA?.usp || 'n/a'}
- Key Features: ${(brandDNA?.keyFeatures || []).join(', ') || 'n/a'}
`.trim();
      }
    }

    let researchContext = '';
    if (wantsResearch) {
      try {
        const searchResponse = await braveSearch(userMessage, 5);
        if (searchResponse.results.length > 0) {
          const formattedSources = searchResponse.results
            .map((result, index) => {
              const published = result.published ? ` (${result.published})` : '';
              return `[${index + 1}] ${result.title}${published}\n${result.url}\n${result.snippet}`;
            })
            .join('\n\n');
          researchContext = `
LIVE-RECHERCHE (QUELLEN):
${formattedSources}
`.trim();
        } else {
          researchContext = 'LIVE-RECHERCHE: Keine Treffer gefunden.';
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
          error: 'Live-Recherche ist aktuell nicht verfügbar.',
          code: 'RESEARCH_UNAVAILABLE',
          detail: message
        }, { status: 503 });
      }
    }

    const attachmentList = Array.isArray(attachments) ? attachments : [];

    let historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (threadId && typeof threadId === 'string') {
      const thread = await prisma.aiChatThread.findFirst({
        where: { id: threadId, userId: user.id },
        select: { id: true }
      });

      if (thread) {
        const recentMessages = await prisma.aiChatMessage.findMany({
          where: { threadId: thread.id },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { role: true, content: true }
        });

        historyMessages = recentMessages
          .reverse()
          .map((item) => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: item.content
          }));
      }
    }
    const isTextAttachment = (item: any) => {
      const type = String(item?.type || '').toLowerCase();
      const name = String(item?.name || '').toLowerCase();
      return (
        type.startsWith('text/') ||
        type === 'application/json' ||
        name.endsWith('.txt') ||
        name.endsWith('.md') ||
        name.endsWith('.csv') ||
        name.endsWith('.json')
      );
    };
    const limitLongText = (value: string, max = 1200) =>
      value.length > max ? `${value.slice(0, max).trim()}…` : value;

    let attachmentsContext = '';
    if (attachmentList.length > 0) {
      const lines: string[] = [];
      for (const item of attachmentList) {
        const name = String(item?.name || 'file');
        const type = String(item?.type || 'unknown');
        const url = String(item?.url || '');
        const size = typeof item?.size === 'number' ? `${Math.round(item.size / 1024)}kb` : 'n/a';
        lines.push(`- ${name} (${type}, ${size}) ${url ? `• ${url}` : ''}`.trim());
      }

      const textSnippets: string[] = [];
      for (const item of attachmentList) {
        if (!isTextAttachment(item) || !item?.url) continue;
        try {
          const res = await fetch(String(item.url));
          if (!res.ok) continue;
          const text = await res.text();
          if (!text.trim()) continue;
          textSnippets.push(`--- ${item.name} ---\n${limitLongText(text)}`);
        } catch {
          // ignore attachment read errors
        }
      }

      const imageAnalyses: string[] = [];
      const videoAnalyses: string[] = [];
      const pdfSummaries: string[] = [];

      // Process images with Kimi K2.5 (primary) or Gemini (fallback)
      const imageItems = attachmentList.filter(isImageAttachment).slice(0, 2);
      for (const item of imageItems) {
        if (!item?.url) continue;
        try {
          const buffer = await fetchAttachmentBuffer(String(item.url));
          const base64 = buffer.toString('base64');
          const mimeType = String(item.type || 'image/jpeg');
          const prompt = `${IMAGE_ANALYSIS_PROMPT}\n\nUSER_REQUEST:\n${userMessage}`;

          let analysis = '';

          // Try Kimi K2.5 first
          if (process.env.MOONSHOT_API_KEY) {
            try {
              analysis = await callKimiInline(prompt, base64, mimeType);
              console.log('[Image Analysis] ✅ Kimi K2.5 used');
            } catch (kimiError) {
              console.warn('[Image Analysis] Kimi failed, falling back to Gemini:', kimiError);
            }
          }

          // Fallback to Gemini if Kimi failed
          if (!analysis && process.env.GEMINI_API_KEY) {
            analysis = await callGeminiInline(GEMINI_IMAGE_MODEL, GEMINI_IMAGE_API_VERSION, [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } }
            ]);
            console.log('[Image Analysis] ✅ Gemini used (fallback)');
          }

          if (analysis) {
            const name = String(item?.name || 'image');
            imageAnalyses.push(`--- ${name} ---\n${analysis}`);
          }
        } catch (error) {
          console.error('[Image Analysis] Error:', error);
          // ignore - continue with next image
        }
      }

      // Process Videos (Gemini Multimodal)
      if (process.env.GEMINI_API_KEY) {
        const videoItems = attachmentList.filter(isVideoAttachment).slice(0, 1);
        for (const item of videoItems) {
          if (!item?.url) continue;
          try {
            // Max 20MB for inline video analysis to avoid Vercel timeouts/limits
            const buffer = await fetchAttachmentBuffer(String(item.url), 20 * 1024 * 1024);
            const base64 = buffer.toString('base64');
            const mimeType = String(item.type || 'video/mp4');
            
            const analysis = await callGeminiInline(GEMINI_VIDEO_MODEL, GEMINI_IMAGE_API_VERSION, [
              { text: `${VIDEO_ANALYSIS_PROMPT}\n\nUSER_REQUEST:\n${userMessage}` },
              { inline_data: { mime_type: mimeType, data: base64 } }
            ]);

            if (analysis) {
              const name = String(item?.name || 'video');
              videoAnalyses.push(`--- ${name} ---\n${analysis}`);
            }
          } catch (error) {
            console.error('[Video Analysis] Error (likely too large):', error);
            videoAnalyses.push(`--- ${item.name} ---\n(Video konnte nicht analysiert werden - evtl. zu groß für Inline-Analyse. Bitte lade kleinere Clips hoch (<20MB) oder nutze Keyframes.)`);
          }
        }
      }

      // Process PDFs (Gemini only for now - Kimi PDF support TBD)
      if (process.env.GEMINI_API_KEY) {
        const pdfItems = attachmentList.filter(isPdfAttachment).slice(0, 1);
        for (const item of pdfItems) {
          if (!item?.url) continue;
          try {
            const buffer = await fetchAttachmentBuffer(String(item.url), 8 * 1024 * 1024);
            const summary = await callGeminiInline(GEMINI_DOC_MODEL, GEMINI_DOC_API_VERSION, [
              { text: `${PDF_SUMMARY_PROMPT}\n\nUSER_REQUEST:\n${userMessage}` },
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: buffer.toString('base64')
                }
              }
            ]);
            if (summary) {
              const name = String(item?.name || 'document.pdf');
              pdfSummaries.push(`--- ${name} ---\n${summary}`);
            }
          } catch {
            // ignore pdf errors
          }
        }
      }

      attachmentsContext = `
ANHÄNGE:
${lines.map((line) => limitText(line, 400)).join('\n')}
${textSnippets.length ? `\nDATEI-AUSZÜGE:\n${textSnippets.join('\n\n')}` : ''}
${imageAnalyses.length ? `\nBILD-ANALYSE:\n${imageAnalyses.join('\n\n')}` : ''}
${videoAnalyses.length ? `\nVIDEO-ANALYSE:\n${videoAnalyses.join('\n\n')}` : ''}
${pdfSummaries.length ? `\nPDF-ZUSAMMENFASSUNG:\n${pdfSummaries.join('\n\n')}` : ''}
`.trim();
    }

    const systemPrompt = `
    Du bist Forge AI, der operative Assistent im "THE FORGE" Venture Studio System.
    
    ${forgeKnowledge}
    
    DEIN AKTUELLER KONTEXT:
    - Der User befindet sich auf der Seite: ${pathname}
    - Der spezifische Kontext ist: "${context}"
    ${userContext ? `\n${userContext}\n` : ''}
    ${ventureContext ? `\n${ventureContext}\n` : ''}
    ${researchContext ? `\n${researchContext}\n` : ''}
    ${attachmentsContext ? `\n${attachmentsContext}\n` : ''}
    
    DEINE ROLLE:
    - Hilf dem User, Aufgaben in diesem spezifischen Kontext zu erledigen.
    - Beziehe dich bei Bedarf auf die Core Module (z.B. Admin Shield für Verträge, Supply Chain Command für Sourcing).
    - Wenn der User ein Formular ausfüllt, gib hilfreiche Tipps für die Felder.
    - Bevorzuge kostenlose Tools oder Free-Tier Optionen. Nenne Kosten nur, wenn sie relevant sind.
    - Wenn Zahlen/Quellen fehlen oder veraltet sein könnten, markiere Unsicherheit kurz und schlage einen Verifikationsweg vor.
    - Wenn Kontext fehlt, stelle 1 kurze Rückfrage.
    - Wenn LIVE-RECHERCHE vorhanden ist: nutze sie aktiv, zitiere Quellen als [1], [2] und verlinke die URLs.
    - Antworte immer kurz, prägnant und hilfreich.
    - Nutze Markdown für bessere Lesbarkeit.
    - Wenn der User nach deinen Fähigkeiten fragt: gib eine sehr kurze Übersicht (max. 5-7 Bullet-Points) und frage nach, welchen Bereich er vertiefen will. Details nur auf Nachfrage.

    TOOLING:
    - Du darfst Aktionen ausführen (Aufgaben erstellen, Memory speichern/suchen, Supplier durchsuchen, Legal-Drafts, Marketing-Kampagnen).
    - Nutze Tools nur wenn es dem User klar hilft oder explizit gewünscht ist.
    - Wenn Pflichtinfos fehlen (z.B. Venture), stelle 1 kurze Rückfrage statt zu raten.
    - Wenn der User nach vorhandenen Lieferanten fragt (z.B. "haben wir", "liste", "zeige"), rufe IMMER zuerst "list_suppliers" auf. Antworte niemals, dass du keinen Zugriff hast.
    - Wenn der User einen Supplier nennt und Details will, nutze "get_supplier".
    - Nach Tool-Calls: kurz bestätigen und Ergebnis zusammenfassen.

    WICHTIG (CONFIRMATION FLOW):
    - Jede Aktion MUSS vor Ausführung bestätigt werden.
    - Wenn du eine Aktion vorschlagen willst, rufe ZUERST das passende Tool auf, damit ein confirmationToken erzeugt wird. Stelle danach die Bestätigungsfrage.
    - Wenn eine Tool-Antwort "requiresConfirmation" enthält, frage den User nach Bestätigung.
    - Bei Zustimmung: rufe das Tool "confirm_action" mit dem confirmationToken auf.
    - Bei Ablehnung: rufe "cancel_action" mit dem confirmationToken auf.
    - Actions sind NUR für Founder erlaubt. Wenn kein Founder, erkläre kurz, dass es nicht möglich ist.
    - Wenn eine Aktion möglich ist, frage am Ende aktiv: "Soll ich das für dich erledigen?"
    
    ANTWORTE IMMER AUF DEUTSCH.
    `;

    const maxTokens = wantsResearch ? 900 : 1000;
    const creditsPer1k = parsePositiveInt(process.env.AI_CREDITS_PER_1K_TOKENS, 1);
    const researchBaseCredits = parsePositiveInt(process.env.AI_RESEARCH_BASE_CREDITS, 5);
    const baseCredits = wantsResearch ? researchBaseCredits : 0;
    const promptText = `${systemPrompt}\n\n${userMessage}`;
    const estimatedTokens = estimateTokens(promptText) + maxTokens;
    const estimatedTokenCredits = calculateTokenCredits(estimatedTokens, creditsPer1k);
    const estimatedTotalCredits = baseCredits + estimatedTokenCredits;

    let reservationId: string | null = null;
    let reservedCredits = estimatedTotalCredits;
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    try {
      const reservation = await reserveEnergy({
        userId: user.id,
        amount: estimatedTotalCredits,
        feature: wantsResearch ? 'chat.research' : 'chat.assistant',
        requestId,
        metadata: {
          promptTokensEstimate: estimatedTokens,
          maxTokens,
          research: wantsResearch,
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

    let response;
    try {
      if (process.env.GEMINI_API_KEY) {
        response = await callGeminiWithTools(
          [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: userMessage }
          ],
          { temperature: 0.6, maxTokens },
          {
            user: {
              id: user.id,
              name: user.name ?? null,
              email: user.email,
              role: user.role,
              founderNumber: user.founderNumber ?? null
            },
            ventures: allUserVentures.map((venture) => ({ id: venture.id, name: venture.name })),
            activeVentureId: ventureId,
            requestText: userMessage
          }
        );
      } else {
        response = await callAI([
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userMessage }
        ], { maxTokens });
      }
    } catch (error) {
      if (reservationId) {
        await refundEnergy(reservationId, 'ai-failed');
      }
      throw error;
    }

    if (response.error) {
      if (reservationId) {
        await refundEnergy(reservationId, 'ai-error');
      }
       throw new Error(response.error);
    }

    const promptTokens = response.usage?.promptTokens ?? estimateTokens(promptText);
    const completionTokens = response.usage?.completionTokens ?? estimateTokens(response.content);
    const totalTokens = response.usage?.totalTokens ?? (promptTokens + completionTokens);
    const tokenCredits = calculateTokenCredits(totalTokens, creditsPer1k);
    const totalCredits = baseCredits + tokenCredits;

    const settled = reservationId
      ? await settleEnergy({
          reservationId,
          finalCost: totalCredits,
          provider: response.provider,
          model: response.model,
          usage: { promptTokens, completionTokens, totalTokens },
          metadata: {
            reservedCredits,
            research: wantsResearch,
          }
        })
      : null;
    const creditsRemaining = settled?.creditsRemaining;
    const creditsUsed = totalCredits;

    return NextResponse.json({
      response: response.content,
      creditsUsed,
      creditsRemaining
    });

  } catch (error) {
    console.error('Contextual chat failed:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
