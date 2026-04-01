import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedDemoSquad() {
  console.log('🌱 Seeding Demo Squad...\n');

  try {
    // 1. Create Demo Users (if not exist)
    console.log('👥 Creating demo users...');

    const demoUsers = [
      { email: 'sophia@theforge.demo', name: 'Sophia Martinez' },
      { email: 'liam@theforge.demo', name: 'Liam Chen' },
      { email: 'emma@theforge.demo', name: 'Emma Rodriguez' },
      { email: 'noah@theforge.demo', name: 'Noah Patel' },
    ];

    for (const user of demoUsers) {
      await sql`
        INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${user.email}, ${user.name}, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name, "updatedAt" = NOW()
      `;
    }
    console.log(`✅ ${demoUsers.length} demo users created\n`);

    // Get user IDs
    const users = await sql`SELECT id, email, name FROM "User" WHERE email LIKE '%@theforge.demo'`;
    const userMap = new Map(users.rows.map(u => [u.email, u]));

    // 2. Create Demo Squad
    console.log('🚀 Creating demo squad...');

    // Check if demo squad already exists
    const existingSquad = await sql`
      SELECT id FROM squads WHERE name = 'EcoWear Collective' LIMIT 1
    `;

    let squadId;
    if (existingSquad.rows.length > 0) {
      squadId = existingSquad.rows[0].id;
      console.log(`✅ Demo squad already exists: ${squadId}\n`);
    } else {
      const squadResult = await sql`
        INSERT INTO squads (
          name,
          mission,
          squad_type,
          is_public,
          max_members,
          lead_id,
          status,
          is_accepting_members,
          current_members
        )
        VALUES (
          'EcoWear Collective',
          'Nachhaltige Mode für die bewusste Generation. Wir bauen eine Fashion Brand die Style und Sustainability vereint - von Fair-Trade Sourcing bis klimaneutralem Versand.',
          'venture',
          true,
          5,
          ${userMap.get('sophia@theforge.demo')?.id},
          'building',
          true,
          4
        )
        RETURNING id
      `;
      squadId = squadResult.rows[0].id;
      console.log(`✅ Squad created: ${squadId}\n`);
    }


    // 3. Add Squad Members
    console.log('👥 Adding squad members...');

    const members = [
      { email: 'sophia@theforge.demo', role: 'lead', equity: 25 },
      { email: 'liam@theforge.demo', role: 'co-founder', equity: 25 },
      { email: 'emma@theforge.demo', role: 'member', equity: 25 },
      { email: 'noah@theforge.demo', role: 'member', equity: 25 },
    ];

    for (const member of members) {
      const user = userMap.get(member.email);
      if (!user) continue;

      const hoursContributed = Math.floor(Math.random() * 50) + 10;
      const tasksCompleted = Math.floor(Math.random() * 15) + 5;
      const daysAgo = Math.floor(Math.random() * 30);

      await sql`
        INSERT INTO squad_members (
          squad_id,
          user_id,
          role,
          status,
          equity_share,
          equity_type,
          hours_contributed,
          tasks_completed,
          joined_at
        )
        VALUES (
          ${squadId},
          ${user.id},
          ${member.role},
          'active',
          ${member.equity},
          'equal',
          ${hoursContributed},
          ${tasksCompleted},
          NOW() - INTERVAL '1 day' * ${daysAgo}
        )
        ON CONFLICT (squad_id, user_id) DO UPDATE
        SET equity_share = EXCLUDED.equity_share
      `;
    }
    console.log(`✅ ${members.length} members added\n`);

    // 4. Create Venture
    console.log('🎯 Creating venture...');

    const ventureResult = await sql`
      INSERT INTO ventures (
        squad_id,
        name,
        tagline,
        category,
        status,
        current_phase,
        phase_completed,
        brand_name,
        domain,
        target_audience,
        usp,
        moq,
        unit_cost
      )
      VALUES (
        ${squadId},
        'EcoWear',
        'Sustainable Fashion for the Conscious Generation',
        'fashion',
        'development',
        3,
        2,
        'EcoWear',
        'ecowear.com',
        'Umweltbewusste Millennials & Gen-Z (25-40 Jahre), Urban, mittleres bis hohes Einkommen',
        'Erste klimaneutrale Fashion Brand mit vollständig transparenter Supply Chain',
        500,
        24.50
      )
      ON CONFLICT (squad_id) DO UPDATE
      SET name = EXCLUDED.name
      RETURNING id
    `;

    const ventureId = ventureResult.rows[0].id;
    console.log(`✅ Venture created: ${ventureId}\n`);

    // 5. Create Venture Phases
    console.log('📊 Creating venture phases...');

    const phases = [
      { num: 1, name: 'Ideation', status: 'completed', total: 5, completed: 5 },
      { num: 2, name: 'Concept', status: 'completed', total: 8, completed: 8 },
      { num: 3, name: 'Branding', status: 'in_progress', total: 10, completed: 6 },
      { num: 4, name: 'Sourcing', status: 'pending', total: 12, completed: 0 },
      { num: 5, name: 'Prototyping', status: 'pending', total: 15, completed: 0 },
      { num: 6, name: 'Launch', status: 'pending', total: 20, completed: 0 },
    ];

    for (const phase of phases) {
      if (phase.status === 'completed') {
        await sql`
          INSERT INTO venture_phases (
            venture_id, phase_number, phase_name, status,
            total_tasks, completed_tasks, started_at, completed_at
          )
          VALUES (
            ${ventureId}, ${phase.num}, ${phase.name}, ${phase.status},
            ${phase.total}, ${phase.completed}, NOW(), NOW()
          )
          ON CONFLICT (venture_id, phase_number) DO UPDATE
          SET status = EXCLUDED.status, completed_tasks = EXCLUDED.completed_tasks
        `;
      } else if (phase.status === 'in_progress') {
        await sql`
          INSERT INTO venture_phases (
            venture_id, phase_number, phase_name, status,
            total_tasks, completed_tasks, started_at, completed_at
          )
          VALUES (
            ${ventureId}, ${phase.num}, ${phase.name}, ${phase.status},
            ${phase.total}, ${phase.completed}, NOW(), NULL
          )
          ON CONFLICT (venture_id, phase_number) DO UPDATE
          SET status = EXCLUDED.status, completed_tasks = EXCLUDED.completed_tasks
        `;
      } else {
        await sql`
          INSERT INTO venture_phases (
            venture_id, phase_number, phase_name, status,
            total_tasks, completed_tasks, started_at, completed_at
          )
          VALUES (
            ${ventureId}, ${phase.num}, ${phase.name}, ${phase.status},
            ${phase.total}, ${phase.completed}, NULL, NULL
          )
          ON CONFLICT (venture_id, phase_number) DO UPDATE
          SET status = EXCLUDED.status, completed_tasks = EXCLUDED.completed_tasks
        `;
      }
    }
    console.log(`✅ ${phases.length} phases created\n`);

    // 6. Get Squad Wallet (auto-created by trigger)
    const walletResult = await sql`
      SELECT id FROM squad_wallets WHERE squad_id = ${squadId} LIMIT 1
    `;

    let walletId;
    if (walletResult.rows.length === 0) {
      // Manually create if trigger didn't fire
      const newWallet = await sql`
        INSERT INTO squad_wallets (squad_id, balance, budget_total, budget_allocated_samples, budget_allocated_production)
        VALUES (${squadId}, 3200, 5000, 500, 3000)
        RETURNING id
      `;
      walletId = newWallet.rows[0].id;
    } else {
      walletId = walletResult.rows[0].id;
      // Update wallet
      await sql`
        UPDATE squad_wallets
        SET balance = 3200,
            budget_total = 5000,
            budget_allocated_samples = 500,
            budget_allocated_production = 3000
        WHERE id = ${walletId}
      `;
    }

    // 7. Add Wallet Transactions
    console.log('💰 Adding transactions...');

    const transactions = [
      { type: 'deposit', category: 'samples', amount: 500, desc: 'Initial Sample Budget' },
      { type: 'expense', category: 'samples', amount: -180, desc: 'Fabric Samples von Supplier A' },
      { type: 'expense', category: 'samples', amount: -120, desc: 'Logo Design Mockups' },
      { type: 'deposit', category: 'production', amount: 3000, desc: 'Production Budget Allocation' },
      { type: 'deposit', category: 'marketing', amount: 1000, desc: 'Marketing Budget' },
    ];

    for (const tx of transactions) {
      const daysAgo = Math.floor(Math.random() * 20);

      await sql`
        INSERT INTO wallet_transactions (
          wallet_id,
          squad_id,
          type,
          category,
          amount,
          description,
          created_by,
          created_at
        )
        VALUES (
          ${walletId},
          ${squadId},
          ${tx.type},
          ${tx.category},
          ${Math.abs(tx.amount)},
          ${tx.desc},
          ${userMap.get('sophia@theforge.demo')?.id},
          NOW() - INTERVAL '1 day' * ${daysAgo}
        )
      `;
    }
    console.log(`✅ ${transactions.length} transactions added\n`);

    // 8. Add Supplier
    console.log('🏭 Adding demo supplier...');

    // Check if supplier already exists
    const existingSupplier = await sql`
      SELECT id FROM suppliers WHERE name = 'GreenThread Manufacturing' LIMIT 1
    `;

    let supplierId;
    if (existingSupplier.rows.length > 0) {
      supplierId = existingSupplier.rows[0].id;
      console.log(`✅ Supplier already exists: ${supplierId}\n`);
    } else {
      const supplierResult = await sql`
        INSERT INTO suppliers (
          name,
          website,
          email,
          country,
          city,
          categories,
          moq,
          lead_time_days,
          certifications,
          rating,
          total_reviews,
          verified,
          discovered_by,
          discovered_via
        )
        VALUES (
          'GreenThread Manufacturing',
          'https://greenthread.example.com',
          'sales@greenthread.example.com',
          'Portugal',
          'Porto',
          ARRAY['fashion', 'textiles', 'sustainable'],
          500,
          45,
          ARRAY['GOTS', 'Fair Trade', 'OEKO-TEX'],
          4.8,
          12,
          true,
          ${userMap.get('liam@theforge.demo')?.id},
          'ai-research'
        )
        RETURNING id
      `;
      supplierId = supplierResult.rows[0].id;
      console.log(`✅ Supplier created: ${supplierId}\n`);
    }

    // 9. Add Samples
    console.log('📦 Adding samples...');

    await sql`
      INSERT INTO samples (
        squad_id,
        supplier_id,
        product_type,
        description,
        quantity,
        cost,
        shipping_cost,
        ordered_at,
        received_at,
        status,
        approved,
        rating,
        feedback,
        production_ready
      )
      VALUES (
        ${squadId},
        ${supplierId},
        'T-Shirt',
        'Organic Cotton T-Shirt - verschiedene Farben',
        10,
        150,
        30,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '8 days',
        'reviewed',
        true,
        5,
        'Exzellente Qualität! Stoff fühlt sich premium an. Farben sind genau wie gewünscht. Ready für Production.',
        true
      )
    `;
    console.log(`✅ Sample added\n`);

    // 10. Add Votes (SKIPPED - votes table not created yet)
    console.log('⏭️  Skipping votes (table not ready)\n');

    // 11. Summary
    console.log('='.repeat(60));
    console.log('✅ DEMO SQUAD ERFOLGREICH ERSTELLT!\n');
    console.log('Squad Details:');
    console.log(`  Name: EcoWear Collective`);
    console.log(`  ID: ${squadId}`);
    console.log(`  Members: ${members.length}`);
    console.log(`  Venture: EcoWear (Phase 3/6)`);
    console.log(`  Budget: €3,200 / €5,000`);
    console.log(`  Samples: 1 (approved)`);
    console.log(`  Supplier: GreenThread Manufacturing (Portugal)`);
    console.log('='.repeat(60));
    console.log('\n🎯 Jetzt kannst du das Squad auf der Website sehen!');
    console.log(`   → https://www.stakeandscale.de/squads/${squadId}\n`);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedDemoSquad();
