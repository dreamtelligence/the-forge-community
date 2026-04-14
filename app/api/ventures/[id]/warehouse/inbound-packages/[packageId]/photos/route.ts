import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getWarehouseAccess } from '@/lib/warehouse/access';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_PHOTOS_PER_PACKAGE = 12;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const DEFAULT_PHOTO_RETENTION_DAYS = 30;

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, packageId } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const existing = await prisma.inboundPackage.findFirst({
    where: {
      id: packageId,
      ventureId: id,
    },
    select: {
      id: true,
      photoUrls: true,
      photoRetentionUntil: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Inbound-Paket nicht gefunden' }, { status: 404 });
  }

  if (existing.photoUrls.length >= MAX_PHOTOS_PER_PACKAGE) {
    return NextResponse.json(
      { error: `Maximal ${MAX_PHOTOS_PER_PACKAGE} Fotos pro Paket erlaubt` },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const fileEntry = formData.get('file');
  if (!isFileLike(fileEntry)) {
    return NextResponse.json({ error: 'Datei fehlt (FormData key: file)' }, { status: 400 });
  }

  const file = fileEntry as File;
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Datei ist zu gross (max. 8MB)' }, { status: 413 });
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return NextResponse.json({ error: 'Nur Bilddateien sind erlaubt' }, { status: 415 });
  }

  const retentionRaw = Number(formData.get('retentionDays'));
  const retentionDays = Number.isFinite(retentionRaw)
    ? Math.max(1, Math.min(365, Math.trunc(retentionRaw)))
    : DEFAULT_PHOTO_RETENTION_DAYS;
  const photoRetentionUntil = existing.photoRetentionUntil
    ? existing.photoRetentionUntil
    : (() => {
        const dt = new Date();
        dt.setDate(dt.getDate() + retentionDays);
        return dt;
      })();

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFilename(file.name || 'inbound-photo.jpg');
  const filename = `warehouse/${id}/inbound/${packageId}/${Date.now()}-${safeName}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mime,
  });

  const nextPhotoUrls = Array.from(new Set([...existing.photoUrls, blob.url]));

  const updated = await prisma.inboundPackage.update({
    where: { id: existing.id },
    data: {
      photoUrls: nextPhotoUrls,
      photoRetentionUntil,
      handledById: access.userId,
    },
    select: {
      id: true,
      photoUrls: true,
      photoRetentionUntil: true,
    },
  });

  return NextResponse.json(updated, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, packageId } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return NextResponse.json({ error: 'url ist erforderlich' }, { status: 400 });
  }

  const existing = await prisma.inboundPackage.findFirst({
    where: {
      id: packageId,
      ventureId: id,
    },
    select: {
      id: true,
      photoUrls: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Inbound-Paket nicht gefunden' }, { status: 404 });
  }

  if (!existing.photoUrls.includes(url)) {
    return NextResponse.json({ error: 'Foto-URL nicht gefunden' }, { status: 404 });
  }

  const updated = await prisma.inboundPackage.update({
    where: { id: existing.id },
    data: {
      photoUrls: existing.photoUrls.filter((entry) => entry !== url),
      handledById: access.userId,
    },
    select: {
      id: true,
      photoUrls: true,
      photoRetentionUntil: true,
    },
  });

  return NextResponse.json(updated);
}

