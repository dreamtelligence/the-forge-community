import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { knowledgeBasePrompt } from '@/lib/knowledge-base';
import { RateLimiters } from '@/lib/rate-limit';
import { buildAiSdkTools } from '@/lib/orion-tools';
// personal-studio ventures are excluded via isPersonalStudio flag

// Configure Gemini as primary
const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Configure Groq as fallback
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  // SECURITY: Rate limit
  const rateLimitResponse = await RateLimiters.aiChatbot(req);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Context Injection & Long-Term Memory
  let userContext = '';
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, role: true, email: true, founderNumber: true, memories: { orderBy: { createdAt: 'desc' }, take: 20 } }
  });
  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  const memoryLines = user.memories.map(m => `- [${m.category}]: ${m.content}`).join('\n');
  userContext = `
USER CONTEXT:
Name: ${user.name}
Role: ${user.role}

LONG-TERM MEMORY (DEINE ERINNERUNGEN AN DIESEN USER):
${memoryLines || 'Noch keine Erinnerungen vorhanden. Nutze das Tool "store_user_memory", um wichtige Fakten zu speichern.'}
`;

  const { messages } = await req.json();

  const allUserVentures = await prisma.venture.findMany({
    where: {
      OR: [
        { ownerId: user?.id },
        { squad: { members: { some: { userId: user?.id, leftAt: null } } } }
      ],
      isPersonalStudio: false,
    },
    select: { id: true, name: true }
  });

  const systemPrompt = `
    ${knowledgeBasePrompt}

    ${userContext}

    DEINE PERSÖNLICHKEIT & PHILOSOPHIE (WICHTIG):
    Du bist Orion, der persönliche Jarvis-Assistent für ${user?.name || 'den Founder'}.
    Antworte prägnant, unternehmerisch und loyal.

    - Dein Motto: "Aufgeben ist keine Option."
    - Deine Haltung: "Ich akzeptiere mein Schicksal nicht. Ich ändere es."
    - Dein Stil: Direkt, ehrlich, fast schon schmerzhaft real. Kein "Corporate Bullshit".
    
    DEINE MEMORY-FUNKTION:
    Wenn der User sagt "merk dir das", "speichere das" oder dir wichtige persönliche Infos gibt (Ziele, Vorlieben, Fakten), dann nutze das Tool "store_user_memory".
    Du hast Zugriff auf alle vorherigen Erinnerungen oben im Kontext.

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

    WICHTIG:
    - Sprich den User als "Founder" oder direkt beim Vornamen an.
    - Antworte immer auf Deutsch.
    - Sei kurz, knackig und extrem handlungsorientiert.
    - Wenn der User nach deinen Fähigkeiten fragt: gib eine sehr kurze Übersicht (max. 5-7 Bullet-Points) und frage nach, welchen Bereich er vertiefen will. Details nur auf Nachfrage.
  `;

  const lastUserMessage = Array.isArray(messages)
    ? [...messages].reverse().find((msg) => msg?.role === 'user')?.content
    : undefined;

  const tools = buildAiSdkTools({
    user: {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      role: user.role,
      founderNumber: user.founderNumber ?? null
    },
    ventures: allUserVentures,
    activeVentureId: null,
    requestText: typeof lastUserMessage === 'string' ? lastUserMessage : undefined
  });

  // Try Gemini first, fallback to Groq
  try {
    const result = await streamText({
      model: gemini('gemini-2.0-flash-exp'),
      system: systemPrompt,
      messages,
      tools: tools as any, // Allow tool execution and response
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.warn('Gemini failed, falling back to Groq:', error);

    // Fallback to Groq
    const result = await streamText({
      model: groq('llama-3.1-70b-versatile'),
      system: systemPrompt,
      messages,
      tools: tools as any,
    });

    return result.toTextStreamResponse();
  }
}
