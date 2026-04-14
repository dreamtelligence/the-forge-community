/**
 * Notion Search API
 *
 * GET /api/integrations/notion/search?q=query
 * Search for pages in user's Notion workspace
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { searchNotionPages, getValidNotionToken } from '@/lib/integrations/notion/service';

export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get valid Notion token
    const accessToken = await getValidNotionToken(user.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Notion not connected', code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }

    // Search pages
    const pages = await searchNotionPages(accessToken, query);

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('[Notion Search API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
