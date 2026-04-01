import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  // 🔒 SECURITY: Auth-Check
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json({ error: 'Missing id or content' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 🔒 SECURITY: Owner-Check - Nur eigene Posts dürfen bearbeitet werden
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { id: true, authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prüfe ob der eingeloggte User der Autor ist
    if (post.authorId !== user.id) {
      return NextResponse.json({
        error: 'Forbidden: You can only edit your own posts'
      }, { status: 403 });
    }

    // User ist authentifiziert UND der Autor -> Bearbeiten erlaubt
    const updated = await prisma.forumPost.update({
      where: { id },
      data: { content }
    });
    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      updatedAt: updated.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
