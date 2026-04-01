import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

/**
 * Creates webhook_events table for Stripe webhook idempotency
 *
 * Run once: GET /api/admin/setup-webhook-table
 */
export async function GET() {
  // SECURITY: Only admin can run this
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  try {
    // Create webhook_events table for idempotency
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_events (
        event_id TEXT PRIMARY KEY,
        processed_at TIMESTAMP DEFAULT NOW()
      );
    `;

    return NextResponse.json({
      success: true,
      message: 'Webhook events table created successfully',
      table: 'webhook_events',
      columns: ['event_id', 'processed_at'],
      indexes: []
    });
  } catch (error: any) {
    console.error('Webhook table setup failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
