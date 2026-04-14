import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSquads() {
  console.log('🔍 Checking Squads in Database...\n');

  try {
    // 1. Count total squads
    const countResult = await sql`SELECT COUNT(*) as total FROM squads`;
    console.log(`Total Squads: ${countResult.rows[0].total}`);

    // 2. List all squads
    const squadsResult = await sql`
      SELECT
        id,
        name,
        mission,
        status,
        is_public,
        current_members,
        max_members,
        created_at
      FROM squads
      ORDER BY created_at DESC
    `;

    console.log('\n📋 Squad List:\n');
    if (squadsResult.rows.length === 0) {
      console.log('❌ No squads found in database!');
      console.log('\nℹ️  You need to run: npm run seed-demo-squad');
    } else {
      squadsResult.rows.forEach((squad, idx) => {
        console.log(`${idx + 1}. ${squad.name}`);
        console.log(`   ID: ${squad.id}`);
        console.log(`   Status: ${squad.status}`);
        console.log(`   Public: ${squad.is_public}`);
        console.log(`   Members: ${squad.current_members}/${squad.max_members}`);
        console.log(`   Created: ${squad.created_at}`);
        console.log('');
      });
    }

    // 3. Check for demo squad specifically
    const demoSquad = await sql`
      SELECT * FROM squads WHERE name = 'EcoWear Collective' LIMIT 1
    `;

    if (demoSquad.rows.length > 0) {
      console.log('✅ Demo Squad "EcoWear Collective" exists!');
    } else {
      console.log('❌ Demo Squad "EcoWear Collective" NOT found!');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSquads();
