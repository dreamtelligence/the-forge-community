import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

export const maxDuration = 10;

/**
 * Polish voice-transcribed text with AI
 */
export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    // Polish with Gemini
    const result = await callAI([
      {
        role: 'system',
        content: `Du bist ein Text-Editor der gesprochene Sprache in geschriebenen Text umwandelt.

        REGELN:
        - Korrigiere Grammatik & Rechtschreibung
        - Strukturiere in sinnvolle Sätze
        - Füge passende Absätze hinzu (mit \\n\\n)
        - Entferne Füllwörter (ähm, äh, also wenn überflüssig)
        - Behalte den INHALT exakt - ändere keine Fakten!
        - Behalte die STIMME des Sprechers
        - Antworte NUR mit dem polierten Text, keine Erklärungen`
      },
      {
        role: 'user',
        content: text
      }
    ], { temperature: 0.3, maxTokens: 500 });

    return NextResponse.json({
      original: text,
      polished: result.content.trim(),
      provider: result.provider
    });

  } catch (error: any) {
    console.error('Text polish error:', error);
    return NextResponse.json(
      { error: 'Failed to polish text', details: error.message },
      { status: 500 }
    );
  }
}
