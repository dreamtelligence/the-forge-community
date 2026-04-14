/**
 * AI-Powered Content Moderation System
 * 3-Strike Warning System with Fair Penalties
 */

import { callAI } from './ai';
import { prisma } from './prisma';

export interface ModerationResult {
  isToxic: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  confidence: number;
  category?: 'HARASSMENT' | 'HATE_SPEECH' | 'VIOLENCE' | 'SPAM' | 'NSFW' | 'OTHER';
}

/**
 * Check content for toxicity using AI
 */
export async function moderateContent(content: string): Promise<ModerationResult> {
  try {
    const response = await callAI(
      [
        {
          role: 'system',
          content: `Du bist ein Content-Moderator. Analysiere den folgenden Text auf toxisches Verhalten:

          Kategorien:
          - HARASSMENT: Belästigung, Mobbing, persönliche Angriffe
          - HATE_SPEECH: Hassrede, Diskriminierung
          - VIOLENCE: Gewaltandrohungen, Aufrufe zu Gewalt
          - SPAM: Spam, wiederholte Werbung
          - NSFW: Explizite Inhalte

          Antworte NUR im folgenden JSON-Format (ohne weitere Erklärungen):
          {
            "isToxic": true/false,
            "severity": "LOW"/"MEDIUM"/"HIGH",
            "reason": "kurze Begründung auf Deutsch",
            "confidence": 0.0-1.0,
            "category": "HARASSMENT"/"HATE_SPEECH"/"VIOLENCE"/"SPAM"/"NSFW"/"OTHER"
          }

          Severity Guidelines:
          - LOW: Leichte Unhöflichkeit, unprofessionelle Sprache
          - MEDIUM: Klare Beleidigungen, aggressive Sprache
          - HIGH: Hassrede, Gewaltdrohungen, schwere Verstöße

          Nur als toxisch markieren, wenn es eine direkte Beleidigung, gezielte Herabwürdigung,
          Mobbing oder klare Drohung ist. Einzelne Woerter ohne Angriff (z.B. Tippfehler oder
          neutrale Begriffe) nicht als toxisch werten. Business-Kritik ist OK, persoenliche Angriffe nicht.`
        },
        {
          role: 'user',
          content: `Analysiere diesen Text:\n\n${content}`
        }
      ],
      { temperature: 0.1, maxTokens: 200 }
    );

    // Parse AI response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      isToxic: result.isToxic || false,
      severity: result.severity || 'LOW',
      reason: result.reason || 'No specific reason provided',
      confidence: result.confidence || 0.5,
      category: result.category || 'OTHER'
    };
  } catch (error) {
    console.error('Moderation check failed:', error);
    // Fail-safe: Don't block content if AI fails
    return {
      isToxic: false,
      severity: 'LOW',
      reason: 'Moderation service unavailable',
      confidence: 0,
      category: 'OTHER'
    };
  }
}

const BAD_WORDS = [
  'idiot',
  'dumm',
  'scheisse',
  'scheiße',
  'arsch',
  'asshole',
  'bitch',
  'fuck',
  'f*ck',
  'bastard',
  'hurensohn'
];

const TARGETED_REGEX = /\b(du|dir|dich|dein|deine|deinen|deiner|deines|you|your|u)\b|@/i;

const MODERATION_NOTE = '_Moderation: Beitrag wurde sprachlich entschärft._\n\n';

function maskBadWords(content: string) {
  const pattern = new RegExp(`\\b(${BAD_WORDS.join('|')})\\b`, 'gi');
  return content.replace(pattern, '*****');
}

export function isTargetedContent(content: string) {
  return TARGETED_REGEX.test(content);
}

export function containsHardBlockWords(content: string) {
  const pattern = new RegExp(`\\b(${BAD_WORDS.join('|')})\\b`, 'gi');
  return pattern.test(content);
}

export type ModerationPolicy = {
  minConfidence: number;
  blockSeverities: ModerationResult['severity'][];
  blockCategories: NonNullable<ModerationResult['category']>[];
  requireTargeted: boolean;
  allowSanitize: boolean;
  sanitizeSeverities: ModerationResult['severity'][];
  sanitizeCategories: NonNullable<ModerationResult['category']>[];
};

export function shouldBlockContent(
  content: string,
  moderationResult: ModerationResult,
  policy: ModerationPolicy
) {
  if (!moderationResult.isToxic) return false;
  if (moderationResult.confidence < policy.minConfidence) return false;
  if (!policy.blockSeverities.includes(moderationResult.severity)) return false;
  const category = moderationResult.category || 'OTHER';
  if (!policy.blockCategories.includes(category)) return false;

  const requiresTarget =
    policy.requireTargeted && (category === 'HARASSMENT' || category === 'HATE_SPEECH');
  if (requiresTarget && !isTargetedContent(content)) return false;

  return true;
}

export function shouldSanitizeContent(
  content: string,
  moderationResult: ModerationResult,
  policy: ModerationPolicy
) {
  if (!policy.allowSanitize) return false;
  if (!moderationResult.isToxic) return false;
  if (moderationResult.confidence < policy.minConfidence) return false;
  if (!policy.sanitizeSeverities.includes(moderationResult.severity)) return false;
  const category = moderationResult.category || 'OTHER';
  if (!policy.sanitizeCategories.includes(category)) return false;

  const requiresTarget =
    policy.requireTargeted && (category === 'HARASSMENT' || category === 'HATE_SPEECH');
  if (requiresTarget && !isTargetedContent(content)) return false;

  return true;
}

export async function sanitizeToxicContent(
  content: string,
  moderationResult: ModerationResult
) {
  try {
    const response = await callAI(
      [
        {
          role: 'system',
          content: `Du bist ein professioneller Moderator. Schreibe den Text so um, dass er respektvoll, sachlich und konstruktiv ist.

          Regeln:
          - Entferne Beleidigungen, Drohungen, Hassrede.
          - Behalte den inhaltlichen Kern (Problem, Wunsch, Kritik).
          - Kein Spott, keine Ironie, keine Bewertung des Autors.
          - Wenn kein sinnvoller Kern vorhanden ist, antworte exakt mit: "Inhalt entfernt wegen beleidigender Sprache."`
        },
        {
          role: 'user',
          content: `Original:\n${content}\n\nBegründung: ${moderationResult.reason}`
        }
      ],
      { temperature: 0.2, maxTokens: 300 }
    );

    const cleaned = response.content?.trim() || 'Inhalt entfernt wegen beleidigender Sprache.';
    return maskBadWords(`${MODERATION_NOTE}${cleaned}`);
  } catch (error) {
    console.error('Content sanitization failed:', error);
    return `${MODERATION_NOTE}Inhalt entfernt wegen beleidigender Sprache.`;
  }
}

/**
 * Issue a warning to a user and handle strike logic
 */
export async function issueWarning(
  userId: string,
  content: string,
  moderationResult: ModerationResult
): Promise<{
  warningNumber: number;
  shouldBan: boolean;
  message: string;
}> {
  // Get current warning count
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { toxicityWarnings: true, isBanned: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.isBanned) {
    throw new Error('User is already banned');
  }

  const newWarningCount = user.toxicityWarnings + 1;

  // Create warning record
  await prisma.moderationWarning.create({
    data: {
      userId,
      content,
      reason: moderationResult.reason,
      severity: moderationResult.severity,
      warningNumber: newWarningCount
    }
  });

  // Update user warning count
  await prisma.user.update({
    where: { id: userId },
    data: { toxicityWarnings: newWarningCount }
  });

  // Determine response based on warning number
  let message = '';
  let shouldBan = false;

  if (newWarningCount === 1) {
    message = `⚠️ **Erste Warnung**\n\nDein Beitrag wurde als unangemessen erkannt:\n"${moderationResult.reason}"\n\nBitte halte dich an unsere Community-Richtlinien. Bei weiteren Verstößen folgen härtere Konsequenzen.`;
  } else if (newWarningCount === 2) {
    message = `⚠️ **Zweite Warnung**\n\nErneuter Verstoß erkannt:\n"${moderationResult.reason}"\n\nDies ist deine zweite Warnung. Noch ein Verstoß und es gibt ernsthafte Konsequenzen.`;
  } else if (newWarningCount === 3) {
    message = `🚨 **LETZTE WARNUNG**\n\nDritter Verstoß:\n"${moderationResult.reason}"\n\n**WICHTIG:** Beim nächsten Verstoß wird dein Account gesperrt und du erhältst eine Rückerstattung deiner Zahlung abzüglich einer fairen Strafgebühr.`;
  } else {
    // 4th strike = BAN
    shouldBan = true;
    await banUser(userId, moderationResult.reason);
    message = `🔒 **Account gesperrt**\n\nDein Account wurde aufgrund wiederholter Verstöße gegen unsere Community-Richtlinien gesperrt.\n\nLetzte Verletzung: "${moderationResult.reason}"\n\nDu erhältst eine Rückerstattung deiner Zahlung abzüglich einer Strafgebühr innerhalb von 7 Werktagen.`;
  }

  return {
    warningNumber: newWarningCount,
    shouldBan,
    message
  };
}

/**
 * Ban user and process refund
 */
async function banUser(userId: string, reason: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      banReason: reason,
      bannedAt: new Date()
    }
  });

  // TODO: Trigger payment refund with penalty
  // This should integrate with your payment system (Stripe, PayPal, etc.)
  // For now, just log it
  console.log(`[REFUND REQUIRED] User ${userId} banned. Reason: ${reason}`);

  // Optional: Send email notification about ban and refund
  // await sendBanNotificationEmail(userId);
}

/**
 * Check if user is allowed to post (not banned, not over limit)
 */
export async function canUserPost(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, toxicityWarnings: true }
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (user.isBanned) {
    return {
      allowed: false,
      reason: 'Your account has been banned due to repeated violations of our community guidelines.'
    };
  }

  return { allowed: true };
}
