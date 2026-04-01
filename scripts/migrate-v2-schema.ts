import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function migrateSchemaV2() {
  console.log('🚀 Starting Database Migration V2.0 - AI-Powered Venture Studio');
  console.log('='.repeat(70));

  try {
    // Read the schema file
    const schemaPath = path.resolve(process.cwd(), 'DATABASE-SCHEMA-V2.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    console.log('\n📄 Schema file loaded successfully');
    console.log(`   File: ${schemaPath}`);
    console.log(`   Size: ${(schemaSQL.length / 1024).toFixed(2)}KB\n`);

    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementPreview = statement.substring(0, 100).replace(/\n/g, ' ');

      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${statementPreview}...`);
        await sql.query(statement);
        successCount++;
        console.log(`   ✅ Success\n`);
      } catch (error: any) {
        // Check if error is due to already existing object
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('IF NOT EXISTS')
        ) {
          skipCount++;
          console.log(`   ⚠️  Skipped (already exists)\n`);
        } else {
          errorCount++;
          console.error(`   ❌ Error: ${error.message}\n`);
        }
      }
    }

    console.log('='.repeat(70));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully executed: ${successCount} statements`);
    console.log(`⚠️  Skipped (existing):   ${skipCount} statements`);
    console.log(`❌ Failed:                ${errorCount} statements`);
    console.log('='.repeat(70));

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Check errors above.');
      console.log('   The schema may be partially applied.');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('   Database is now ready for AI-Powered Venture Studio V2.\n');

      // Verify key tables
      console.log('🔍 Verifying key tables...\n');

      const tables = [
        'squads',
        'squad_members',
        'ventures',
        'venture_phases',
        'suppliers',
        'supplier_reviews',
        'samples',
        'squad_wallets',
        'wallet_transactions',
        'votes',
        'vote_responses',
        'ai_research_logs',
        'ai_generated_assets',
        'time_entries'
      ];

      for (const table of tables) {
        try {
          const result = await sql.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = result.rows[0]?.count || 0;
          console.log(`   ✅ ${table.padEnd(25)} → ${count} rows`);
        } catch (_e: any) {
          console.log(`   ❌ ${table.padEnd(25)} → NOT FOUND`);
        }
      }

      console.log('\n🎉 Database V2 is ready! You can now:');
      console.log('   1. Create Squads');
      console.log('   2. Build Ventures');
      console.log('   3. Use AI Matchmaking (pgvector)');
      console.log('   4. Track Samples & Suppliers');
      console.log('   5. Manage Squad Budgets');
      console.log('   6. Generate AI Assets\n');
    }

  } catch (error: any) {
    console.error('\n❌ FATAL ERROR during migration:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateSchemaV2();
