import { NextResponse } from 'next/server';
import { getTransactions, addTransaction } from '@/lib/integrations/notion';
import { requireAdmin } from '@/lib/security/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const transactions = await getTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error in transactions API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();

    const { description, amount, category, type, date, status, receiptUrl, notes } = body;

    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    const normalizedCategory = typeof category === 'string' ? category.trim() : '';
    const normalizedType = typeof type === 'string' ? type.trim() : '';
    const normalizedAmount = Number(amount);
    const normalizedDate = new Date(date);

    if (
      !normalizedDescription ||
      !normalizedCategory ||
      !normalizedType ||
      !Number.isFinite(normalizedAmount) ||
      Number.isNaN(normalizedDate.getTime())
    ) {
      return NextResponse.json(
        { error: 'Invalid transaction payload' },
        { status: 400 }
      );
    }

    const result = await addTransaction({
      description: normalizedDescription,
      amount: normalizedAmount,
      category: normalizedCategory,
      type: normalizedType,
      date: normalizedDate.toISOString(),
      status,
      receiptUrl,
      notes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json(
      { error: 'Failed to add transaction' },
      { status: 500 }
    );
  }
}
