import { NextResponse } from 'next/server';

// The former example charged credits for a placeholder URL. Keep it unavailable
// until it delegates to a real provider flow with reservation/refund coverage.
export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'External image generation is not available. Use the authenticated Marketing Studio.',
      },
    },
    { status: 501, headers: { 'Cache-Control': 'no-store' } }
  );
}
