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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 🔒 SECURITY: Owner-Check - Nur eigene Posts dürfen gelöscht werden
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { id: true, authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prüfe ob der eingeloggte User der Autor ist
    if (post.authorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({
        error: 'Forbidden: You can only delete your own posts'
      }, { status: 403 });
    }

    // User ist authentifiziert UND der Autor -> Löschen erlaubt
    await prisma.forumPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
