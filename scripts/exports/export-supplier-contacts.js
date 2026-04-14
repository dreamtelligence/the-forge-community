require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function getCount(connectionString, tableName) {
  const client = new Client({ connectionString });
  await client.connect();
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"`);
  await client.end();
  return result.rows[0]?.count ?? 0;
}

async function pickBestConnectionString() {
  const candidates = [
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_PRISMA_URL',
  ];

  const seen = new Set();
  const checks = [];

  for (const key of candidates) {
    const value = process.env[key];
    if (!value || seen.has(value)) continue;
    seen.add(value);
    checks.push({ key, value });
  }

  let best = null;

  for (const entry of checks) {
    try {
      const supplierCount = await getCount(entry.value, 'Supplier');
      const resourceCount = await getCount(entry.value, 'Resource');
      const score = supplierCount + resourceCount;

      if (!best || score > best.score) {
        best = { ...entry, score, supplierCount, resourceCount };
      }
    } catch {
      // Ignore unreachable endpoints and keep trying remaining URLs.
    }
  }

  if (!best) {
    throw new Error('Keine erreichbare Datenbank-URL gefunden.');
  }

  return best;
}

function toTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [String(value)];
}

async function main() {
  const bestConnection = await pickBestConnectionString();
  const client = new Client({ connectionString: bestConnection.value });
  await client.connect();

  const supplierQuery = [
    'SELECT s.id,',
    '       v.name AS venture_name,',
    '       s."companyName" AS company_name,',
    '       s."contactName" AS contact_name,',
    '       s.email,',
    '       s.phone,',
    '       s.website,',
    '       s.country,',
    '       s.category,',
    '       s.specialization,',
    '       s.rating,',
    '       s."leadTimeDays" AS lead_time_days,',
    '       s.moq,',
    '       s."paymentTerms" AS payment_terms,',
    '       s.tags,',
    '       s."updatedAt" AS updated_at',
    'FROM "Supplier" s',
    'LEFT JOIN "Venture" v ON v.id = s."ventureId"',
    'ORDER BY COALESCE(v.name, \'\'), s."companyName"'
  ].join(' ');

  const resourceQuery = [
    'SELECT r.id,',
    '       r.title AS company_name,',
    '       COALESCE(r."contactInfo"->>\'name\', r."contactInfo"->>\'contactName\') AS contact_name,',
    '       COALESCE(r."contactInfo"->>\'email\', r."contactEmail") AS email,',
    '       r."contactInfo"->>\'phone\' AS phone,',
    '       r.url AS website,',
    '       COALESCE(r."contactInfo"->>\'address\', r.location) AS address,',
    '       r.location,',
    '       r.category,',
    '       r.type,',
    '       r.tags,',
    '       r."updatedAt" AS updated_at',
    'FROM "Resource" r',
    'WHERE r.category = \'B2B_DIRECTORY\'',
    '   OR LOWER(COALESCE(r.type, \'\')) IN (\'supplier\', \'manufacturer\', \'service\', \'wholesaler\', \'vendor\')',
    'ORDER BY r.title'
  ].join(' ');

  const supplierResult = await client.query(supplierQuery);
  const resourceResult = await client.query(resourceQuery);

  const mergedRows = [
    ...supplierResult.rows.map((r) => ({
      source: 'Supplier',
      id: r.id,
      venture_name: r.venture_name,
      company_name: r.company_name,
      contact_name: r.contact_name,
      email: r.email,
      phone: r.phone,
      website: r.website,
      address: '',
      country_or_location: r.country,
      category: r.category,
      type: '',
      specialization: r.specialization,
      rating: r.rating,
      lead_time_days: r.lead_time_days,
      moq: r.moq,
      payment_terms: r.payment_terms,
      tags: toTags(r.tags),
      updated_at: r.updated_at,
    })),
    ...resourceResult.rows.map((r) => ({
      source: 'Resource',
      id: r.id,
      venture_name: '',
      company_name: r.company_name,
      contact_name: r.contact_name,
      email: r.email,
      phone: r.phone,
      website: r.website,
      address: r.address,
      country_or_location: r.location,
      category: r.category,
      type: r.type,
      specialization: '',
      rating: '',
      lead_time_days: '',
      moq: '',
      payment_terms: '',
      tags: toTags(r.tags),
      updated_at: r.updated_at,
    })),
  ];

  const dateStamp = new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), 'docs');
  fs.mkdirSync(outDir, { recursive: true });

  const csvPath = path.join(outDir, `haendler-kontaktliste-${dateStamp}.csv`);
  const contactCsvPath = path.join(outDir, `haendler-kontaktliste-kontaktierbar-${dateStamp}.csv`);
  const mdPath = path.join(outDir, `haendler-kontaktliste-${dateStamp}.md`);

  const headers = [
    'source',
    'id',
    'venture_name',
    'company_name',
    'contact_name',
    'email',
    'phone',
    'website',
    'address',
    'country_or_location',
    'category',
    'type',
    'specialization',
    'rating',
    'lead_time_days',
    'moq',
    'payment_terms',
    'tags',
    'updated_at'
  ];

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    const str = Array.isArray(value) ? JSON.stringify(value) : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const csvLines = [headers.join(',')];
  for (const row of mergedRows) {
    csvLines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  fs.writeFileSync(csvPath, `${csvLines.join('\n')}\n`, 'utf8');

  const total = mergedRows.length;
  const withEmail = mergedRows.filter((r) => !!r.email).length;
  const withPhone = mergedRows.filter((r) => !!r.phone).length;
  const withAnyContact = mergedRows.filter((r) => !!r.email || !!r.phone).length;
  const contactRows = mergedRows.filter((r) => !!r.email || !!r.phone);

  const contactCsvLines = [headers.join(',')];
  for (const row of contactRows) {
    contactCsvLines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  fs.writeFileSync(contactCsvPath, `${contactCsvLines.join('\n')}\n`, 'utf8');

  const preview = mergedRows.slice(0, 20).map((r, i) =>
    `${i + 1}. [${r.source}] ${r.company_name || '-'} | ${r.contact_name || '-'} | ${r.email || '-'} | ${r.phone || '-'} | ${r.venture_name || r.country_or_location || '-'}`
  );

  const md = [
    '# Haendler-Kontaktliste',
    '',
    `Stand: ${dateStamp}`,
    '',
    `- Gesamt: ${total}`,
    `- Aus Supplier: ${supplierResult.rowCount}`,
    `- Aus Resource: ${resourceResult.rowCount}`,
    `- Mit E-Mail: ${withEmail}`,
    `- Mit Telefon: ${withPhone}`,
    `- Mit E-Mail oder Telefon: ${withAnyContact}`,
    '',
    `CSV-Datei: docs/${path.basename(csvPath)}`,
    `Kontaktierbar (nur mit E-Mail/Telefon): docs/${path.basename(contactCsvPath)}`,
    '',
    '## Schnellansicht (erste 20)',
    '',
    ...preview,
  ].join('\n');

  fs.writeFileSync(mdPath, `${md}\n`, 'utf8');

  await client.end();

  console.log('EXPORT_OK');
  console.log(`db_key=${bestConnection.key}`);
  console.log(`db_supplier_count=${bestConnection.supplierCount}`);
  console.log(`db_resource_count=${bestConnection.resourceCount}`);
  console.log(`csv=${csvPath}`);
  console.log(`contact_csv=${contactCsvPath}`);
  console.log(`md=${mdPath}`);
  console.log(`rows=${total}`);
  console.log(`with_contact=${withAnyContact}`);
}

main().catch((error) => {
  console.error('EXPORT_FAIL', error.message);
  process.exit(1);
});
