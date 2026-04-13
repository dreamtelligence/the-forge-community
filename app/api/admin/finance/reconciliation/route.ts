import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getFinanceReconciliationReport } from '@/lib/finance-reconciliation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const url = new URL(request.url);
  const daysBackRaw = Number(url.searchParams.get('daysBack'));
  const maxItemsRaw = Number(url.searchParams.get('maxItems'));

  const report = await getFinanceReconciliationReport({
    daysBack: Number.isFinite(daysBackRaw) ? daysBackRaw : undefined,
    maxItems: Number.isFinite(maxItemsRaw) ? maxItemsRaw : undefined,
  });

  return NextResponse.json(report);
}
