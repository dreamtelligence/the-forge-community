import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Extract Last Frame from Video
 * Uses Canvas API approach for browser-compatible extraction
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });
    }

    // Fetch video as blob
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video');
    }


    // We'll use a different approach: return the video URL and let client extract frame
    // OR: Use ffmpeg via child_process (requires ffmpeg in deployment)

    // For now, return metadata - client will handle extraction
    return NextResponse.json({
      videoUrl,
      message: 'Use client-side extraction or implement ffmpeg'
    });

  } catch (error: any) {
    console.error('Frame extraction error:', error);
    return NextResponse.json({
      error: error.message || 'Frame extraction failed'
    }, { status: 500 });
  }
}
