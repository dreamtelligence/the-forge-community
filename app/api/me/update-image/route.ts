import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { assignFounderNumberIfMissing } from '@/lib/founder-number';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json({ error: 'Missing filename or body' }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Storage configuration missing' }, { status: 500 });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name ?? null
        },
        select: { id: true }
      });
    }

    await assignFounderNumberIfMissing(user.id);

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-');

    // 1. Upload to Vercel Blob
    const blob = await put(`avatars/${user.id}-${safeFilename}`, request.body, {
      access: 'public',
    });

    // 2. Update user in Database
    await prisma.user.update({
      where: { email: session.user.email },
      data: { image: blob.url }
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
