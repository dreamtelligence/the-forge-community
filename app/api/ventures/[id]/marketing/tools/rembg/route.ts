import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/energy';
import { generateUUID } from '@/lib/utils/uuid';
import { getReplicateClientForUser } from '@/lib/provider-keys';

const COST = 2; // Cheap tool
const MODEL_VERSION = "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  const imageUrl = formData.get('imageUrl') as string | null;

  if (!file && !imageUrl) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Energy Reservation
  const requestId = request.headers.get('x-request-id') || generateUUID();
  let reservationId: string | null = null;

  try {
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: COST,
      feature: 'marketing.tools.rembg',
      requestId,
      metadata: { ventureId: id, tool: 'rembg' }
    });
    reservationId = reservation.reservationId;

    // Prepare Input
    let inputImage: string;
    
    if (file) {
      // Upload raw file to blob first to get a URL for Replicate
      // (Replicate accepts files too, but this is cleaner for asset tracking)
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `temp/rembg-input-${Date.now()}-${file.name}`;
      const blob = await put(filename, buffer, { access: 'public', contentType: file.type });
      inputImage = blob.url;
    } else {
      inputImage = imageUrl!;
    }

    const replicateClientContext = await getReplicateClientForUser(user.id);
    if (!replicateClientContext) {
      return NextResponse.json(
        { error: 'Kein Replicate Key konfiguriert. Bitte BYOK oder Plattform-Key setzen.' },
        { status: 500 }
      );
    }

    const output = await replicateClientContext.client.run(
      MODEL_VERSION,
      {
        input: {
          image: inputImage
        }
      }
    );

    // Output is usually a URL string (or array of streams, but for rembg it's a URL/File)
    const resultUrl = String(output);

    // Download the result and save to our blob (to persist it)
    const resultRes = await fetch(resultUrl);
    const resultBuffer = Buffer.from(await resultRes.arrayBuffer());
    
    const finalFilename = `marketing/${user.id}/${Date.now()}-rembg.png`;
    const finalBlob = await put(finalFilename, resultBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    // Save Asset
    const asset = await prisma.mediaAsset.create({
      data: {
        ventureId: id,
        ownerId: user.id,
        type: 'IMAGE',
        url: finalBlob.url,
        filename: finalFilename,
        mimeType: 'image/png',
        source: 'EDITED', // It's an edited version
        model: 'rembg',
        tags: ['tool', 'rembg', 'no-background']
      }
    });

    await settleEnergy({
      reservationId,
      finalCost: COST,
      provider: 'replicate',
      model: 'rembg'
    });

    return NextResponse.json({
      status: 'succeeded',
      asset,
      creditsUsed: COST
    });

  } catch (error: any) {
    if (reservationId) await refundEnergy(reservationId, 'tool-failed');
    if (error instanceof InsufficientEnergyError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: error.requiredCredits,
          creditsAvailable: error.creditsAvailable,
        },
        { status: 402 }
      );
    }
    console.error('RemBG Error:', error);
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
