import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { startMarketingMediaGeneration } from '@/lib/ai/application/start-marketing-media-generation';
import { getMarketingMediaGenerationStatus } from '@/lib/ai/application/get-marketing-media-generation-status';
import { toMarketingMediaErrorResponse } from '@/lib/ai/contracts/marketing-media';
import { RateLimiters } from '@/lib/security/rate-limit';
import { generateUUID } from '@/lib/utils/uuid';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await RateLimiters.media(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const formData = await request.formData();
    const result = await startMarketingMediaGeneration({
      userEmail: session.user.email,
      ventureId: id,
      requestId: request.headers.get('x-request-id') || generateUUID(),
      formData,
    });

    return NextResponse.json(result);
  } catch (error) {
    const response = toMarketingMediaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const predictionId = request.nextUrl.searchParams.get('predictionId');
  if (!predictionId) {
    return NextResponse.json({ error: 'predictionId fehlt.' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await getMarketingMediaGenerationStatus({
      userEmail: session.user.email,
      ventureId: id,
      predictionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const response = toMarketingMediaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
