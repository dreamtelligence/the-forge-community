import { NextResponse } from 'next/server';
import type { ModerationPolicy } from '@/lib/moderation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const MAX_LIMIT = 100;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const beforeParam = url.searchParams.get('before');
    const limit = Math.min(Number(limitParam) || 50, MAX_LIMIT);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const participant = await prisma.directParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId: user.id
        }
      },
      select: { id: true }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messageFilter = beforeParam
      ? { createdAt: { lt: new Date(beforeParam) } }
      : {};

    const [messages, thread] = await Promise.all([
      prisma.directMessage.findMany({
        where: {
          threadId,
          ...messageFilter
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
              profileSlug: true,
              founderNumber: true
            }
          }
        }
      }),
      prisma.directThread.findUnique({
        where: { id: threadId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  profileSlug: true,
                  founderNumber: true
                }
              }
            }
          }
        }
      })
    ]);

    await prisma.directParticipant.update({
      where: {
        threadId_userId: {
          threadId,
          userId: user.id
        }
      },
      data: { lastReadAt: new Date() }
    });

    return NextResponse.json({
      threadId,
      participants: thread?.participants.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        name: entry.user.name,
        image: entry.user.image,
        profileSlug: entry.user.profileSlug,
        founderNumber: entry.user.founderNumber
      })) || [],
      messages: messages
        .reverse()
        .map((message) => ({
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          senderId: message.senderId,
          sender: message.sender
        }))
    });
  } catch (error) {
    console.error('[THREAD MESSAGES GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;
    const body = await request.json();
    const trimmedContent = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!trimmedContent) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }
    if (trimmedContent.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const participant = await prisma.directParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId: user.id
        }
      },
      select: { id: true }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      moderateContent,
      issueWarning,
      canUserPost,
      containsHardBlockWords,
      isTargetedContent,
      shouldBlockContent
    } = await import('@/lib/moderation');
    const messageCheck = await canUserPost(user.id);
    if (!messageCheck.allowed) {
      return NextResponse.json({
        error: 'Messaging restricted',
        reason: messageCheck.reason
      }, { status: 403 });
    }

    const moderationResult = await moderateContent(trimmedContent);
    const finalContent = trimmedContent;

    const dmPolicy: ModerationPolicy = {
      minConfidence: 0.8,
      blockSeverities: ['MEDIUM', 'HIGH'],
      blockCategories: ['HARASSMENT', 'HATE_SPEECH', 'VIOLENCE'],
      requireTargeted: true,
      allowSanitize: false,
      sanitizeSeverities: [],
      sanitizeCategories: []
    };

    const hasHardBlock = containsHardBlockWords(trimmedContent) && isTargetedContent(trimmedContent);
    const shouldBlock = hasHardBlock || shouldBlockContent(trimmedContent, moderationResult, dmPolicy);

    if (shouldBlock) {
      const warningResult = await issueWarning(user.id, trimmedContent, moderationResult);
      return NextResponse.json({
        error: 'Content violates community guidelines',
        warning: {
          number: warningResult.warningNumber,
          message: warningResult.message,
          banned: warningResult.shouldBan
        }
      }, { status: 400 });
    }

    const message = await prisma.directMessage.create({
      data: {
        threadId,
        senderId: user.id,
        content: finalContent
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            profileSlug: true,
            founderNumber: true
          }
        }
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
          userId: user.id
        }
      },
      data: { lastReadAt: message.createdAt }
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      senderId: message.senderId,
      sender: message.sender
    });
  } catch (error) {
    console.error('[THREAD MESSAGES POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
