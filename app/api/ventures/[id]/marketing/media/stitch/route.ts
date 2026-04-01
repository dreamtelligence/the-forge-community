import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const maxDuration = 10;

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    { error: 'Video-Stitching ist nicht mehr verfuegbar.' },
    { status: 410 }
  );
}
