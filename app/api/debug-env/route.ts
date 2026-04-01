import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const vars = [
    'AUTH_SECRET',
    'AUTH_RESEND_KEY',
    'AUTH_URL',
    'AUTH_TRUST_HOST',
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID',
    'NOTION_FORUM_DATABASE_ID',
    'NOTION_VOTES_DATABASE_ID',
    'NOTION_TRANSACTIONS_DATABASE_ID',
    'NOTION_ANNOUNCEMENTS_DATABASE_ID',
    'NOTION_TASKS_DATABASE_ID',
    'NOTION_DOCUMENTS_DATABASE_ID',
    'NOTION_EVENTS_DATABASE_ID'
  ];

  const status = vars.reduce((acc, key) => {
    const val = process.env[key];
    acc[key] = val ? `Vorhanden (Länge: ${val.length})` : 'FEHLT ❌';
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    variables: status,
    timestamp: new Date().toISOString()
  });
}
