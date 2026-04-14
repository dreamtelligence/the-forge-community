import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { RateLimiters } from '@/lib/security/rate-limit';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(request: Request): Promise<NextResponse> {
  const rateLimitResponse = await RateLimiters.forumUpload(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json({ error: 'Missing filename or body' }, { status: 400 });
  }

  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 415 });
  }
  if (contentLength && contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (_error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
