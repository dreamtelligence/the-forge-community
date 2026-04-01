import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { syncBrandDNAToNotion } from '@/lib/integrations/notion/service';
import { z } from 'zod';

const createPageSchema = z.object({
  parentPageId: z.string(),
  ventureId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { parentPageId, ventureId } = createPageSchema.parse(body);

    // Verify user has access to this venture
    const venture = await prisma.venture.findFirst({
      where: {
        id: ventureId,
        ownerId: user.id,
      },
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 403 });
    }

    // Sync Brand DNA to Notion
    const result = await syncBrandDNAToNotion(user.id, ventureId, parentPageId);

    return NextResponse.json({ success: true, page: { id: result.notionPageId, url: result.notionUrl } });
  } catch (error) {
    console.error('[NOTION_PAGES_POST]', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create page' },
      { status: 500 }
    );
  }
}
