import { callAI } from './ai';

/**
 * AI Prompt Engine - January 2026
 * Refines raw user input into professional, high-end technical prompts for Flux and Kling.
 */

const PROMPT_EXPANDER_SYSTEM_MESSAGE = `
Du bist ein professioneller Media-Director und AI-Prompt-Engineer für High-End Marketing.
Deine Aufgabe: Nimm den kurzen Input eines Users und erweitere ihn zu einem extrem detaillierten, technischen Prompt für Bild- oder Video-KIs (wie Flux 1.1 Pro oder Kling 2.6).

RICHTLINIEN FÜR BILDER (Image):
- Füge Details zu Beleuchtung hinzu (z.B. "cinematic lighting", "golden hour", "soft studio box light").
- Beschreibe die Kamera-Optik (z.B. "shot on 35mm lens", "f/1.8", "depth of field", "highly detailed skin textures").
- Optimiere für Realismus: "hyper-realistic", "8k resolution", "commercial photography style".
- Entferne schwammige Begriffe, ersetze sie durch technische Präzision.

RICHTLINIEN FÜR VIDEOS (Video):
- Beschreibe die Kamerabewegung (z.B. "slow drone sweep", "handheld tracking shot", "smooth cinematic pan").
- Beschreibe die Dynamik: "fluid motion", "physics-accurate movement".
- Setze den Fokus auf Atmosphäre und Texturen.

AUSGABE:
Antworte NUR mit dem finalen, optimierten Prompt in ENGLISCHER Sprache. Kein Chitchat, keine Einleitung.
`;

export async function expandPrompt(rawInput: string, type: 'image' | 'video' = 'image'): Promise<string> {
  try {
    const response = await callAI([
      {
        role: 'system',
        content: `${PROMPT_EXPANDER_SYSTEM_MESSAGE}\nDies ist ein Prompt für ein ${type === 'image' ? 'BILD' : 'VIDEO'}.`
      },
      {
        role: 'user',
        content: `Raw Input: "${rawInput}"`
      }
    ], { 
      temperature: 0.8, // Kreativität erlauben
      maxTokens: 500 
    });

    return response.content.trim();
  } catch (error) {
    console.error('Prompt expansion failed, falling back to raw input:', error);
    return rawInput; // Fallback auf Original, falls AI-Layer failt
  }
}
