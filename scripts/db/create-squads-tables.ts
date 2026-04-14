import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function createSquadsTables() {
  console.log('🔨 Creating Squads Tables...\n');

  try {
    // 1. Create squads table
    console.log('Creating squads table...');
    await sql`
      CREATE TABLE IF NOT EXISTS squads (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name VARCHAR(100) NOT NULL,
        mission TEXT,
        status VARCHAR(50) DEFAULT 'forming',

        lead_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,

        min_members INTEGER DEFAULT 2,
        max_members INTEGER DEFAULT 5,
        current_members INTEGER DEFAULT 1,

        created_at TIMESTAMP DEFAULT NOW(),
        launched_at TIMESTAMP,
        archived_at TIMESTAMP,

        squad_type VARCHAR(50) DEFAULT 'venture',

        is_public BOOLEAN DEFAULT true,
        is_accepting_members BOOLEAN DEFAULT true
      )
    `;
    console.log('✅ squads table created\n');

    // 2. Create indexes
    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_squads_status ON squads(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_squads_public ON squads(is_public, is_accepting_members)`;
    console.log('✅ Indexes created\n');

    // 3. Create squad_members table
    console.log('Creating squad_members table...');
    await sql`
      CREATE TABLE IF NOT EXISTS squad_members (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,

        role VARCHAR(50) DEFAULT 'member',

        equity_share DECIMAL(5,2) DEFAULT 0.00,
        equity_type VARCHAR(50) DEFAULT 'equal',

        hours_contributed INTEGER DEFAULT 0,
        tasks_completed INTEGER DEFAULT 0,
        votes_cast INTEGER DEFAULT 0,

        capital_contributed DECIMAL(10,2) DEFAULT 0.00,

        status VARCHAR(50) DEFAULT 'active',
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,

        invited_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
        invitation_accepted_at TIMESTAMP,

        UNIQUE(squad_id, user_id)
      )
    `;
    console.log('✅ squad_members table created\n');

    // 4. Create squad_members indexes
    console.log('Creating squad_members indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_squad_members_squad ON squad_members(squad_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_squad_members_user ON squad_members(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_squad_members_status ON squad_members(status)`;
    console.log('✅ squad_members indexes created\n');

    // 5. Create ventures table
    console.log('Creating ventures table...');
    await sql`
      CREATE TABLE IF NOT EXISTS ventures (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        squad_id TEXT UNIQUE NOT NULL REFERENCES squads(id) ON DELETE CASCADE,

        name VARCHAR(150),
        tagline TEXT,
        category VARCHAR(50),

        status VARCHAR(50) DEFAULT 'concept',
        current_phase INTEGER DEFAULT 1,
        phase_completed INTEGER DEFAULT 0,

        brand_name VARCHAR(100),
        domain VARCHAR(255),
        logo_url TEXT,
        brand_colors TEXT[],
        brand_fonts TEXT[],

        target_audience TEXT,
        usp TEXT,

        selected_supplier_id TEXT,

        moq INTEGER,
        unit_cost DECIMAL(10,2),
        first_order_date DATE,
        first_order_quantity INTEGER,

        launch_url TEXT,
        launch_date DATE,
        first_sale_date DATE,

        total_revenue DECIMAL(12,2) DEFAULT 0.00,
        total_orders INTEGER DEFAULT 0,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        launched_at TIMESTAMP,

        ai_logo_prompt TEXT,
        ai_product_description TEXT
      )
    `;
    console.log('✅ ventures table created\n');

    // 6. Create venture_phases table
    console.log('Creating venture_phases table...');
    await sql`
      CREATE TABLE IF NOT EXISTS venture_phases (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
        phase_number INTEGER NOT NULL,
        phase_name VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(venture_id, phase_number)
      )
    `;
    console.log('✅ venture_phases table created\n');

    // 7. Create suppliers table
    console.log('Creating suppliers table...');
    await sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name VARCHAR(200) NOT NULL,
        website TEXT,
        email VARCHAR(255),
        country VARCHAR(100),
        city VARCHAR(100),
        categories TEXT[],
        moq INTEGER,
        lead_time_days INTEGER,
        certifications TEXT[],
        rating DECIMAL(3,2) DEFAULT 0.00,
        total_reviews INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        discovered_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
        discovered_via VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ suppliers table created\n');

    // 8. Create samples table
    console.log('Creating samples table...');
    await sql`
      CREATE TABLE IF NOT EXISTS samples (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
        supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
        product_type VARCHAR(100),
        description TEXT,
        quantity INTEGER,
        cost DECIMAL(10,2),
        shipping_cost DECIMAL(10,2),
        ordered_at TIMESTAMP DEFAULT NOW(),
        received_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'ordered',
        approved BOOLEAN DEFAULT false,
        rating INTEGER,
        feedback TEXT,
        production_ready BOOLEAN DEFAULT false
      )
    `;
    console.log('✅ samples table created\n');

    // 9. Create squad_wallets table
    console.log('Creating squad_wallets table...');
    await sql`
      CREATE TABLE IF NOT EXISTS squad_wallets (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        squad_id TEXT UNIQUE NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
        balance DECIMAL(12,2) DEFAULT 0.00,
        budget_total DECIMAL(12,2) DEFAULT 0.00,
        budget_allocated_samples DECIMAL(12,2) DEFAULT 0.00,
        budget_allocated_production DECIMAL(12,2) DEFAULT 0.00,
        budget_allocated_marketing DECIMAL(12,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ squad_wallets table created\n');

    // 10. Create wallet_transactions table
    console.log('Creating wallet_transactions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        wallet_id TEXT NOT NULL REFERENCES squad_wallets(id) ON DELETE CASCADE,
        squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        created_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ wallet_transactions table created\n');

    console.log('='.repeat(60));
    console.log('✅ ALL SQUADS TABLES CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nNext step: Run seed-demo-squad.ts to create demo data\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createSquadsTables();
