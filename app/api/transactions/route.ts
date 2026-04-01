import { NextResponse } from 'next/server';
import { getTransactions, addTransaction } from '@/lib/notion';

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
  try {
    const body = await request.json();

    const { description, amount, category, type, date, status, receiptUrl, notes } = body;

    if (!description || !amount || !category || !type || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await addTransaction({
      description,
      amount,
      category,
      type,
      date,
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
