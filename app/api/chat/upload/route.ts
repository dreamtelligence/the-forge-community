import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';

const MAX_UPLOAD_BYTES = 300 * 1024 * 1024; // 300MB
const MAX_FILES = 5;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/json',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/quicktime',
  'video/webm'
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'txt',
  'csv',
  'json',
  'pdf',
  'xls',
  'xlsx',
  'doc',
  'docx',
  'mp4',
  'mov',
  'webm'
]);

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value);
};

export async function POST(request: Request) {
  const rateLimitResponse = await RateLimiters.forumUpload(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files');
  if (!files.length) {
    return NextResponse.json({ error: 'Keine Dateien gefunden.' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximal ${MAX_FILES} Dateien erlaubt.` }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const uploads: Array<{ url: string; name: string; type: string; size: number }> = [];

  for (const entry of files) {
    if (!isFileLike(entry)) {
      return NextResponse.json({ error: 'Ungültige Datei.' }, { status: 415 });
    }

    const file = entry as File;
    const size = typeof file.size === 'number' ? file.size : 0;
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `Datei "${file.name}" ist zu groß.` }, { status: 413 });
    }

    const ext = (file.name?.split('.').pop() || '').toLowerCase();
    const mime = file.type || 'application/octet-stream';
    const isMimeAllowed = ALLOWED_MIME_TYPES.has(mime);
    const isExtAllowed = ext ? ALLOWED_EXTENSIONS.has(ext) : false;

    if (!isMimeAllowed && !isExtAllowed) {
      return NextResponse.json({ error: `Dateityp nicht erlaubt: ${file.name}` }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFilename(file.name || 'file');
    const filename = `chat/${user.id}/${Date.now()}-${safeName}`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: isMimeAllowed ? mime : 'application/octet-stream',
    });

    uploads.push({
      url: blob.url,
      name: file.name || safeName,
      type: mime,
      size
    });
  }

  return NextResponse.json({ attachments: uploads });
}
