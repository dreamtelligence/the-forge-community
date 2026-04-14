import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { createForgeAppSchema } from '@/lib/ai/lab';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      console.warn('[FORGE LAB] GET - Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    console.log(`[FORGE LAB] GET - Fetching apps for venture: ${id}`);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    // Check if prisma is healthy
    if (!prisma.forgeApp) {
      throw new Error('Prisma forgeApp model is not initialized. Did you run prisma generate?');
    }

    const apps = await prisma.forgeApp.findMany({
      where: {
        ventureId: id,
        isArchived: false
      },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`[FORGE LAB] GET - Found ${apps.length} apps`);
    return NextResponse.json(apps);
  } catch (error: any) {
    console.error('[FORGE LAB GET ERROR]:', error);
    return NextResponse.json({ 
      error: 'Datenbank-Fehler oder Schema-Mismatch',
      details: error.message,
      code: error.code // Prisma error codes are useful
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
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

    const validation = createForgeAppSchema.safeParse(data);
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

    const app = await prisma.forgeApp.create({
      data: {
        ventureId: id,
        ownerId: user.id,
        name: payload.name,
        description: payload.description || '',
        inputs: payload.inputs,
        workflow: payload.workflow,
        template: payload.template || '',
        isPublic: false
      }
    });

    return NextResponse.json(app);
  } catch (error: any) {
    console.error('[FORGE LAB POST ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
