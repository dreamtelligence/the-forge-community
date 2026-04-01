import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { updateForgeAppSchema } from '@/lib/forge-lab';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, appId } = await params;
  const data = await request.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const venture = await prisma.venture.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        {
          squad: {
            members: {
              some: {
                userId: user.id,
                leftAt: null
              }
            }
          }
        }
      ]
    },
    select: { id: true }
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
  }

  const validation = updateForgeAppSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: validation.error.issues
      },
      { status: 400 }
    );
  }

  const payload = validation.data;

  const existing = await prisma.forgeApp.findFirst({
    where: { id: appId, ventureId: id, isArchived: false }
  });

  if (!existing || existing.ventureId !== id) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 });
  }

  const updated = await prisma.forgeApp.update({
    where: { id: appId },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.inputs !== undefined && { inputs: payload.inputs }),
      ...(payload.workflow !== undefined && { workflow: payload.workflow }),
      ...(payload.template !== undefined && { template: payload.template })
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, appId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const venture = await prisma.venture.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        {
          squad: {
            members: {
              some: {
                userId: user.id,
                leftAt: null
              }
            }
          }
        }
      ]
    },
    select: { id: true }
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
  }

  const existing = await prisma.forgeApp.findFirst({
    where: { id: appId, ventureId: id, isArchived: false }
  });

  if (!existing) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 });
  }

  const updated = await prisma.forgeApp.update({
    where: { id: appId },
    data: { isArchived: true }
  });

  return NextResponse.json(updated);
}
