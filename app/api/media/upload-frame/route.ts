import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { put } from '@vercel/blob';

/**
 * Upload extracted frame to Vercel Blob
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(
      `frames/${Date.now()}_${file.name}`,
      file,
      {
        access: 'public',
        addRandomSuffix: true,
      }
    );

    return NextResponse.json({
      url: blob.url,
      size: file.size,
    });

  } catch (error: any) {
    console.error('Frame upload error:', error);
    return NextResponse.json({
      error: error.message || 'Upload failed'
    }, { status: 500 });
  }
}
