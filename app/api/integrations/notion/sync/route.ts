/**
 * Notion Sync API
 *
 * POST /api/integrations/notion/sync
 * Sync Brand DNA, Roadmap, or Decisions to Notion
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { syncBrandDNAToNotion } from '@/lib/integrations/notion/service';

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { resourceType, resourceId, parentPageId } = body;

    // Validate request
    if (!resourceType || !resourceId || !parentPageId) {
      return NextResponse.json(
        { error: 'Missing required fields: resourceType, resourceId, parentPageId' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has access to the resource
    const hasAccess = await checkResourceAccess(user.id, resourceType, resourceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this resource' },
        { status: 403 }
      );
    }

    // Perform sync based on resource type
    let result;
    switch (resourceType) {
      case 'brand-dna':
        result = await syncBrandDNAToNotion(user.id, resourceId, parentPageId);
        break;
      
      case 'roadmap':
        // TODO: Implement roadmap sync
        return NextResponse.json(
          { error: 'Roadmap sync not yet implemented' },
          { status: 501 }
        );
      
      case 'decisions':
        // TODO: Implement decisions sync
        return NextResponse.json(
          { error: 'Decisions sync not yet implemented' },
          { status: 501 }
        );
      
      default:
        return NextResponse.json(
          { error: `Unknown resource type: ${resourceType}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Notion Sync API] Error:', error);
    
    if (error instanceof Error && error.message.includes('Notion not connected')) {
      return NextResponse.json(
        { error: 'Notion integration not connected', code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * Check if user has access to the resource
 */
async function checkResourceAccess(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  switch (resourceType) {
    case 'brand-dna': {
      const brandDNA = await prisma.brandDNA.findUnique({
        where: { id: resourceId },
        include: {
          venture: {
            select: {
              ownerId: true,
              squad: {
                select: {
                  members: {
                    where: { userId, leftAt: null },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      });
      
      if (!brandDNA) return false;
      
      // Check if user is owner or squad member
      return (
        brandDNA.venture.ownerId === userId ||
        (brandDNA.venture.squad?.members?.length ?? 0) > 0
      );
    }
    
    default:
      return false;
  }
}
