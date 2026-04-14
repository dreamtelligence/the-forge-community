import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createInboundPackagePickupReceipt,
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
    const body = await req.json().catch(() => ({}));
    const receipt = await createInboundPackagePickupReceipt(
      id,
      packageId,
      access.userId,
      body
    );
    return NextResponse.json(receipt);
  } catch (error) {
    if (error instanceof WarehouseInboundPackageValidationError) {
      const status =
        error.code === 'PACKAGE_NOT_FOUND'
          ? 404
          : error.code === 'PACKAGE_CLOSED' || error.code === 'INVALID_PICKUP_TRANSITION'
            ? 409
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to create pickup receipt:', error);
    return NextResponse.json({ error: 'Quittung konnte nicht erstellt werden' }, { status: 500 });
  }
}
