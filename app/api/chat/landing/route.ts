import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { getForgePromptContext } from '@/lib/forge-knowledge';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message required' },
        { status: 400 }
      );
    }

    const forgeKnowledge = getForgePromptContext();

    // Build conversation history
    const messages = [
      {
        role: 'system' as const,
        content: `Du bist Orion, der AI-Guide und Legal Co-Pilot für "The Forge" - ein Community Venture Studio.

        ${forgeKnowledge}

        DEINE AUFGABE:
        - Beantworte Fragen über The Forge, die Mitgliedschaft, den Bewerbungsprozess.
        - Erkläre die 5 CORE MODULE (Admin Shield, Market Radar, etc.) wenn der User danach fragt.
        - Agiere als Legal Co-Pilot: Erkläre unsere rechtliche Struktur (standardisierte Verträge, Slicing Pie Modell).
        - Weise darauf hin, dass finale Dokumente im Founder-Dashboard generiert werden.
        - Sei freundlich, präzise und hilfreich. Antworte IMMER auf Deutsch.
        - Halte Antworten kurz (max 2-3 Sätze).

        Sei authentisch, direkt und kompetent. Keine leeren Marketing-Phrasen.`
      },
      ...(history || []).slice(-4).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Call AI with Gemini Flash + Groq fallback
    const response = await callAI(messages, {
      temperature: 0.7,
      maxTokens: 200
    });

    return NextResponse.json({
      message: response.content,
      provider: response.provider
    });
  } catch (error: any) {
    console.error('Landing chat error:', error);
    return NextResponse.json(
      { error: 'Chat service unavailable', message: 'Entschuldigung, ich bin gerade nicht erreichbar. Bitte versuche es später erneut.' },
      { status: 500 }
    );
  }
}
