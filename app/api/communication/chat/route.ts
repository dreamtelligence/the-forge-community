import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createGoogle } from '@ai-sdk/google';
import { streamText, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream } from 'ai';
import { getUserFullContext } from '@/lib/ai/context';
import { prisma } from '@/lib/database/prisma';
import { buildAiSdkTools } from '@/lib/ai/orion-tools';
import { GEMINI_TEXT_MODELS, geminiThinkingConfig } from '@/lib/ai/text-models';
// personal-studio ventures are excluded via isPersonalStudio flag

const gemini = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
  // Using v1beta for systemInstruction and tools support
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
});


export async function POST(req: NextRequest) {
  console.log('[JARVIS] ========== NEW REQUEST ==========');
  console.log('[JARVIS] Request URL:', req.url);
  console.log('[JARVIS] Request method:', req.method);

  const session = await auth();
  console.log('[JARVIS] Session:', session?.user?.email || 'NO SESSION');

  if (!session?.user?.email) {
    console.log('[JARVIS] ❌ No session found, returning 401');
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  console.log('[JARVIS] ✅ Session valid, proceeding...');

  try {
    const { messages } = await req.json();
    console.log('[JARVIS] Messages received:', messages?.length);

    if (!messages || !Array.isArray(messages)) {
      console.log('[JARVIS] Invalid messages format');
      return NextResponse.json({ error: 'Nachrichten fehlen' }, { status: 400 });
    }

    console.log('[JARVIS] Fetching user context...');
    const userContext = await getUserFullContext(session.user.email);
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true, role: true, founderNumber: true }
    });
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const allUserVentures = await prisma.venture.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { squad: { members: { some: { userId: user.id, leftAt: null } } } }
        ],
        isPersonalStudio: false,
      },
      select: { id: true, name: true }
    });
    console.log('[JARVIS] User context fetched, user ID:', user?.id);

    const systemPrompt = `
      Du bist Orion, der persönliche Jarvis-Assistent von STAKE & SCALE.
      Du hast Zugriff auf alle Daten des Benutzers innerhalb der Plattform.
      
      ${userContext}
      
      DEINE MISSION:
      - Sei der ultimative Co-Founder.
      - Antworte kurz, prägnant und unternehmerisch.
      - Wenn der User nach deinen Fähigkeiten fragt: gib eine sehr kurze Übersicht (max. 5-7 Bullet-Points) und frage nach, welchen Bereich er vertiefen will. Details nur auf Nachfrage.
      - Wenn der User fragt "Was weißt du über mich?" oder "Was sind meine Ziele?", beziehe dich auf LONG-TERM MEMORY und VENTURES.

      TOOLING:
      - Du darfst Aktionen ausführen (Aufgaben erstellen, Memory speichern/suchen, Supplier durchsuchen, Legal-Drafts, Marketing-Kampagnen).
      - Nutze Tools nur wenn es dem User klar hilft oder explizit gewünscht ist.
      - Wenn Pflichtinfos fehlen (z.B. Venture), stelle 1 kurze Rückfrage statt zu raten.
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

    const modelName = GEMINI_TEXT_MODELS.flash;
    console.log('[JARVIS] Starting Gemini stream with model:', modelName);

    const lastUserMessage = Array.isArray(messages)
      ? [...messages].reverse().find((msg) => msg?.role === 'user')?.content
      : undefined;

    const tools = buildAiSdkTools({
      user: { ...user, founderNumber: user.founderNumber ?? null },
      ventures: allUserVentures,
      activeVentureId: null,
      requestText: typeof lastUserMessage === 'string' ? lastUserMessage : undefined
    });

    const result = await streamText({
      model: gemini(modelName),
      instructions: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      providerOptions: {
        google: { thinkingConfig: geminiThinkingConfig(modelName, 'low') },
      },
    });

    console.log('[JARVIS] Gemini stream started successfully');
    return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
  } catch (error) {
    console.error('[JARVIS] Chat failed completely:', error);
    return NextResponse.json({ error: 'AI service unavailable', details: String(error) }, { status: 500 });
  }
}
