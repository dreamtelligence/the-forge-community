import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { FulfillmentOrderSource } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';

function parseProvider(value: string | null): FulfillmentOrderSource | undefined {
  if (!value) return undefined;
  return Object.values(FulfillmentOrderSource).includes(value as FulfillmentOrderSource)
    ? (value as FulfillmentOrderSource)
    : undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const provider = parseProvider(searchParams.get('provider'));
  const resolvedParam = searchParams.get('resolved');
  const resolved =
    resolvedParam === 'true' ? true : resolvedParam === 'false' ? false : undefined;

  const errors = await prisma.warehouseImportError.findMany({
    where: {
      ventureId: id,
      ...(provider ? { provider } : {}),
      ...(resolved === true ? { resolvedAt: { not: null } } : {}),
      ...(resolved === false ? { resolvedAt: null } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  });

  return NextResponse.json(errors);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const provider =
      parseProvider(body?.provider ?? null) ?? FulfillmentOrderSource.MANUAL;
    const sourceEntity =
      typeof body?.sourceEntity === 'string' ? body.sourceEntity.trim() : '';
    const errorMessage =
      typeof body?.errorMessage === 'string' ? body.errorMessage.trim() : '';

    if (!sourceEntity || !errorMessage) {
      return NextResponse.json(
        { error: 'sourceEntity und errorMessage sind erforderlich' },
        { status: 400 }
      );
    }

    const created = await prisma.warehouseImportError.create({
      data: {
        ventureId: id,
        provider,
        sourceEntity,
        sourceEntityId:
          typeof body?.sourceEntityId === 'string' && body.sourceEntityId.trim()
            ? body.sourceEntityId.trim()
            : null,
        payload: body?.payload ?? undefined,
        errorMessage,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create warehouse import error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
