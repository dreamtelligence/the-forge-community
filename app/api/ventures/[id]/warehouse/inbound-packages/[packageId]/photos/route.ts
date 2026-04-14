import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  addInboundPackagePhoto,
  removeInboundPackagePhoto,
  WarehouseInboundPackageValidationError,
} from '@/lib/warehouse/inbound-packages';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, packageId } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const formData = await req.formData();
    const updated = await addInboundPackagePhoto(id, packageId, access.userId, {
      file: formData.get('file'),
      retentionDays: formData.get('retentionDays'),
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof WarehouseInboundPackageValidationError) {
      const status =
        error.code === 'PACKAGE_NOT_FOUND'
          ? 404
          : error.code === 'FILE_TOO_LARGE'
            ? 413
            : error.code === 'INVALID_FILE_TYPE'
              ? 415
              : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to upload inbound package photo:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
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
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const updated = await removeInboundPackagePhoto(
      id,
      packageId,
      access.userId,
      typeof body?.url === 'string' ? body.url : ''
    );

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof WarehouseInboundPackageValidationError) {
      const status =
        error.code === 'PACKAGE_NOT_FOUND' || error.code === 'PHOTO_URL_NOT_FOUND'
          ? 404
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to delete inbound package photo:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
