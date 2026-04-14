import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { updateVentureProgress } from '@/lib/ventures/index';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify access to venture
    const venture = await prisma.venture.findFirst({
      where: {
        id: id,
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
      include: {
        brandDNA: true
      }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(venture.brandDNA);
  } catch (error) {
    console.error('Failed to fetch Brand DNA:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify access to venture
    const venture = await prisma.venture.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: user.id },
          {
            squad: {
              members: {
                some: {
                  userId: user.id,
                  leftAt: null,
                  role: { in: ['LEAD', 'MEMBER'] } // GUEST cannot edit
                }
              }
            }
          }
        ]
      }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
    }

    // Upsert Brand DNA
    const brandDNA = await prisma.brandDNA.upsert({
      where: { ventureId: id },
      create: {
        ventureId: id,
        brandName: body.brandName,
        tagline: body.tagline,
        mission: body.mission,
        vision: body.vision,
        values: body.values || [],
        toneOfVoice: body.toneOfVoice,
        personality: body.personality || [],
        writingStyle: body.writingStyle,
        targetAudience: body.targetAudience,
        customerPersona: body.customerPersona,
        primaryColor: body.primaryColor,
        secondaryColors: body.secondaryColors || [],
        logoUrl: body.logoUrl,
        fontFamily: body.fontFamily,
        productCategory: body.productCategory,
        keyFeatures: body.keyFeatures || [],
        usp: body.usp,
        competitors: body.competitors,
        aiContext: body.aiContext,
        doNotMention: body.doNotMention || [],
        characterPrompt: body.characterPrompt,
      },
      update: {
        brandName: body.brandName,
        tagline: body.tagline,
        mission: body.mission,
        vision: body.vision,
        values: body.values || [],
        toneOfVoice: body.toneOfVoice,
        personality: body.personality || [],
        writingStyle: body.writingStyle,
        targetAudience: body.targetAudience,
        customerPersona: body.customerPersona,
        primaryColor: body.primaryColor,
        secondaryColors: body.secondaryColors || [],
        logoUrl: body.logoUrl,
        fontFamily: body.fontFamily,
        productCategory: body.productCategory,
        keyFeatures: body.keyFeatures || [],
        usp: body.usp,
        competitors: body.competitors,
        aiContext: body.aiContext,
        doNotMention: body.doNotMention || [],
        characterPrompt: body.characterPrompt,
      }
    });

    // Automated Phase Update
    await updateVentureProgress(id);

    return NextResponse.json(brandDNA);
  } catch (error) {
    console.error('Failed to save Brand DNA:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
