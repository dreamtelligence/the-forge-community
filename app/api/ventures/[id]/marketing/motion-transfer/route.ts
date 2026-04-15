import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { RateLimiters } from '@/lib/security/rate-limit';
import { startMotionTransferGeneration } from '@/lib/ai/application/start-motion-transfer-generation';
import { getLegacyReplicateJobStatus } from '@/lib/ai/application/get-legacy-replicate-job-status';
import { toLegacyReplicateErrorResponse } from '@/lib/ai/contracts/legacy-replicate-job';
import { generateUUID } from '@/lib/utils/uuid';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for motion transfer

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await RateLimiters.heavy(request);
  if (rateLimitResponse) return rateLimitResponse;

  const isDryRun = request.headers.get('X-Dry-Run') === 'true';
  const isDev = process.env.NODE_ENV === 'development';
  const session = await auth();
  if (!session?.user?.email && !(isDryRun && isDev)) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { id: ventureId } = await params;
    const formData = await request.formData();
    const result = await startMotionTransferGeneration({
      userEmail: session?.user?.email ?? null,
      ventureId,
      requestId: request.headers.get('x-request-id') || generateUUID(),
      formData,
      isDryRun,
      isDevelopment: isDev,
    });

    return NextResponse.json(result);
  } catch (error) {
    const response = toLegacyReplicateErrorResponse(error);
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

  const { id: ventureId } = await params;
  const predictionId = request.nextUrl.searchParams.get('predictionId');

  if (!predictionId) {
    return NextResponse.json({ error: 'predictionId fehlt' }, { status: 400 });
  }

  try {
    const result = await getLegacyReplicateJobStatus({
      userEmail: session.user.email,
      ventureId,
      predictionId,
      jobKind: 'motion-transfer',
    });

    return NextResponse.json(result);
  } catch (error) {
    const response = toLegacyReplicateErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
