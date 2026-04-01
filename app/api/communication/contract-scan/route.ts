import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { RateLimiters } from '@/lib/rate-limit';
import { analyzeContractPdf } from '@/lib/ai-contract-scan';

export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const rateLimitResponse = await RateLimiters.heavy(req);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const context = String(formData.get('context') || '');

    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      return NextResponse.json({ error: 'PDF fehlt' }, { status: 400 });
    }

    const blob = file as Blob & { name?: string; size?: number; type?: string };
    const contentType = blob.type || '';
    const size = typeof blob.size === 'number' ? blob.size : 0;

    if (contentType !== 'application/pdf') {
      return NextResponse.json({ error: 'Nur PDF-Dateien sind erlaubt' }, { status: 400 });
    }

    if (size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF ist zu gross (max 8MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = await analyzeContractPdf({
      fileName: blob.name || 'contract.pdf',
      buffer,
      context,
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Contract scan failed', error);
    const message = error instanceof Error ? error.message : 'Analyse fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
