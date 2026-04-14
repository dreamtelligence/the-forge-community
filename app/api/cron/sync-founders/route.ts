import { NextResponse } from 'next/server';
import { getFounders } from '@/lib/integrations/notion';
import { prisma } from '@/lib/database/prisma';


export async function GET(request: Request) {
  // Simple protection via secret query param or header (for Vercel Cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow if running locally in dev
    if (process.env.NODE_ENV !== 'development') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const founders = await getFounders();
    let syncedCount = 0;

    for (const founder of founders) {
      if (!founder.email) continue;

      // 1. Sync Squad if exists
      if (founder.groupId && founder.groupName) {
        try {
        } catch (e) {
          console.error(`Failed to sync squad for founder ${founder.email}`, e);
        }
      }

      // 2. Sync User
      // We match by Email because that's our Auth key.
      await prisma.user.upsert({
        where: { email: founder.email },
        create: {
          email: founder.email,
          name: founder.name,
          notionId: founder.id,
          role: (founder.status === 'active' ? 'FOUNDER' : 'USER') as any,
        },
        update: {
          name: founder.name,
          notionId: founder.id,
          role: (founder.status === 'active' ? 'FOUNDER' : 'USER') as any,
        }
      });
      syncedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      synced: syncedCount, 
      totalNotion: founders.length 
    });

  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
