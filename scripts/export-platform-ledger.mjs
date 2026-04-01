import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envLocal = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envLocal });
dotenv.config({ path: envPath });

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx === -1 ? null : args[idx + 1];
};

const profileId = getArg('--profile');
const from = getArg('--from');
const to = getArg('--to');
const outPath = getArg('--out') || path.resolve(process.cwd(), `exports/platform-ledger-${new Date().toISOString().slice(0, 10)}.csv`);

const where = [];
if (profileId) where.push(sql`e."profileId" = ${profileId}`);
if (from) where.push(sql`e."bookedAt" >= ${new Date(from)}`);
if (to) where.push(sql`e."bookedAt" <= ${new Date(to)}`);

const whereClause = where.length
  ? sql`WHERE ${sql.join(where, sql` AND `)}`
  : sql``;

const rows = await sql`
  SELECT
    e.id,
    e."bookedAt",
    e.direction,
    e.source,
    e."amountNet",
    e."taxAmount",
    e."amountGross",
    e.currency,
    e.description,
    e."sourceId",
    e."profileId",
    c.name AS category_name,
    c.code AS category_code,
    i."invoiceNumber" AS invoice_number
  FROM "PlatformLedgerEntry" e
  LEFT JOIN "PlatformLedgerCategory" c ON e."categoryId" = c.id
  LEFT JOIN "PlatformInvoice" i ON e."invoiceId" = i.id
  ${whereClause}
  ORDER BY e."bookedAt" ASC
`;

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const header = [
  'id',
  'bookedAt',
  'direction',
  'source',
  'amountNet',
  'taxAmount',
  'amountGross',
  'currency',
  'description',
  'sourceId',
  'profileId',
  'categoryName',
  'categoryCode',
  'invoiceNumber'
];

const lines = [header.join(',')];
for (const row of rows.rows) {
  lines.push([
    row.id,
    row.bookedAt?.toISOString?.() || row.bookedAt,
    row.direction,
    row.source,
    row.amountNet,
    row.taxAmount,
    row.amountGross,
    row.currency,
    row.description,
    row.sourceId,
    row.profileId,
    row.category_name,
    row.category_code,
    row.invoice_number
  ].map(escapeCsv).join(','));
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');

console.log(`✅ Exported ${rows.rows.length} ledger rows to ${outPath}`);
