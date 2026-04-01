import type { ModerationPolicy } from '@/lib/moderation';
import { prisma } from '@/lib/prisma';

const dmPolicy: ModerationPolicy = {
  minConfidence: 0.8,
  blockSeverities: ['MEDIUM', 'HIGH'],
  blockCategories: ['HARASSMENT', 'HATE_SPEECH', 'VIOLENCE'],
  requireTargeted: true,
  allowSanitize: false,
  sanitizeSeverities: [],
  sanitizeCategories: []
};

function buildThreadKey(userId: string, recipientId: string) {
  return [userId, recipientId].sort().join(':');
}

async function ensureThread(userId: string, recipientId: string) {
  const key = buildThreadKey(userId, recipientId);

  let thread = await prisma.directThread.findUnique({
    where: { key },
    select: { id: true }
  });

  if (!thread) {
    try {
      thread = await prisma.directThread.create({
        data: {
          key,
          participants: {
            create: [
              { userId },
              { userId: recipientId }
            ]
          }
        },
        select: { id: true }
      });
    } catch (error) {
      thread = await prisma.directThread.findUnique({
        where: { key },
        select: { id: true }
      });
      if (!thread) {
        throw error;
      }
    }
  }

  return thread.id;
}

export async function sendDirectMessage({
  senderId,
  recipientId,
  content
}: {
  senderId: string;
  recipientId: string;
  content: string;
}) {
  const {
    moderateContent,
    issueWarning,
    canUserPost,
    containsHardBlockWords,
    isTargetedContent,
    shouldBlockContent
  } = await import('@/lib/moderation');

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Message content required');
  }
  if (trimmedContent.length > 2000) {
    throw new Error('Message too long');
  }

  const messageCheck = await canUserPost(senderId);
  if (!messageCheck.allowed) {
    throw new Error(messageCheck.reason || 'Messaging restricted');
  }

  const moderationResult = await moderateContent(trimmedContent);
  const hasHardBlock = containsHardBlockWords(trimmedContent) && isTargetedContent(trimmedContent);
  const shouldBlock = hasHardBlock || shouldBlockContent(trimmedContent, moderationResult, dmPolicy);

  if (shouldBlock) {
    const warningResult = await issueWarning(senderId, trimmedContent, moderationResult);
    const error = new Error('Content violates community guidelines') as Error & {
      warning?: { number: number; message: string; banned: boolean };
    };
    error.warning = {
      number: warningResult.warningNumber,
      message: warningResult.message,
      banned: warningResult.shouldBan
    };
    throw error;
  }

  const threadId = await ensureThread(senderId, recipientId);

  const message = await prisma.directMessage.create({
    data: {
      threadId,
      senderId,
      content: trimmedContent
    }
  });

  await prisma.directThread.update({
    where: { id: threadId },
    data: { lastMessageAt: message.createdAt }
  });

  await prisma.directParticipant.update({
    where: {
      threadId_userId: {
        threadId,
        userId: senderId
      }
    },
    data: { lastReadAt: message.createdAt }
  });

  return { threadId, messageId: message.id };
}
