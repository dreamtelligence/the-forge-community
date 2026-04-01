import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const normalizeTitle = (value: string) => {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];

  const sanitized = rawMessages
    .filter((msg: any) => msg && typeof msg === 'object')
    .map((msg: any) => ({
      role: typeof msg.role === 'string' ? msg.role : '',
      content: typeof msg.content === 'string' ? msg.content.trim() : '',
      mode: typeof msg.mode === 'string' ? msg.mode : null,
      attachments: msg.attachments ?? null,
      sources: msg.sources ?? null
    }))
    .filter((msg: any) => msg.role && msg.content);

  if (sanitized.length === 0) {
    return NextResponse.json({ error: 'No valid messages provided' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const thread = await tx.aiChatThread.findFirst({
        where: { id: threadId, userId: user.id },
        select: { id: true, title: true }
      });

      if (!thread) {
        return null;
      }

      const createdMessages = await Promise.all(
        sanitized.map((msg: any) =>
          tx.aiChatMessage.create({
            data: {
              threadId: thread.id,
              role: msg.role,
              content: msg.content,
              mode: msg.mode,
              attachments: msg.attachments,
              sources: msg.sources
            },
            select: {
              id: true,
              role: true,
              content: true,
              mode: true,
              attachments: true,
              sources: true,
              createdAt: true
            }
          })
        )
      );

      const firstUserMessage = sanitized.find((msg: any) => msg.role === 'user');
      const nextTitle = !thread.title && firstUserMessage ? normalizeTitle(firstUserMessage.content) : null;

      const updatedThread = await tx.aiChatThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          ...(nextTitle ? { title: nextTitle } : {})
        },
        select: {
          id: true,
          title: true,
          lastMessageAt: true,
          createdAt: true
        }
      });

      return { thread: updatedThread, messages: createdMessages };
    });

    if (!result) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Persist chat messages failed:', error);
    return NextResponse.json({ error: 'Failed to persist messages' }, { status: 500 });
  }
}
