import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envLocal = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envLocal });
dotenv.config({ path: envPath });

const categories = [
  {
    type: 'INCOME',
    name: 'Credits (AI)',
    code: 'INCOME_CREDITS',
    description: 'Credit purchases from users.'
  },
  {
    type: 'INCOME',
    name: 'Subscriptions',
    code: 'INCOME_SUBSCRIPTIONS',
    description: 'Platform subscription revenue.'
  },
  {
    type: 'INCOME',
    name: 'Platform Fees',
    code: 'INCOME_PLATFORM_FEES',
    description: 'Marketplace/platform fees via Stripe Connect.'
  },
  {
    type: 'INCOME',
    name: 'Other Income',
    code: 'INCOME_OTHER',
    description: 'Miscellaneous income.'
  },
  {
    type: 'EXPENSE',
    name: 'AI API Costs',
    code: 'EXPENSE_AI_API',
    description: 'OpenAI, Replicate, ElevenLabs, etc.'
  },
  {
    type: 'EXPENSE',
    name: 'Stripe Fees',
    code: 'EXPENSE_STRIPE_FEES',
    description: 'Stripe processing fees.'
  },
  {
    type: 'EXPENSE',
    name: 'Software & Tools',
    code: 'EXPENSE_SOFTWARE',
    description: 'SaaS subscriptions and tools.'
  },
  {
    type: 'EXPENSE',
    name: 'Hosting & Infra',
    code: 'EXPENSE_HOSTING',
    description: 'Vercel, Neon, storage, etc.'
  },
  {
    type: 'EXPENSE',
    name: 'Marketing',
    code: 'EXPENSE_MARKETING',
    description: 'Ads, creatives, sponsorships.'
  },
  {
    type: 'EXPENSE',
    name: 'Other Expense',
    code: 'EXPENSE_OTHER',
    description: 'Miscellaneous expenses.'
  }
];

async function seedPlatformFinance() {
  console.log('🌱 Seeding Platform Finance categories...');

  const existing = await sql`SELECT id, type, name FROM "PlatformLedgerCategory"`;
  const existingKeys = new Set(existing.rows.map(row => `${row.type}:${row.name}`));

  let created = 0;
  for (const category of categories) {
    const key = `${category.type}:${category.name}`;
    if (existingKeys.has(key)) continue;

    await sql`
      INSERT INTO "PlatformLedgerCategory" (
        id, type, name, code, description, "isSystem", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${category.type},
        ${category.name},
        ${category.code},
        ${category.description},
        true,
        NOW(),
        NOW()
      )
    `;

    created += 1;
  }

  console.log(`✅ ${created} categories inserted (skipped ${categories.length - created} existing)`);
}

seedPlatformFinance().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
