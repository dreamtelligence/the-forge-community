const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function testDatabase(name, dbId) {
  if (!dbId) {
    console.log(`❌ ${name}: No ID in .env.local`);
    return;
  }

  try {
    const db = await notion.databases.retrieve({ database_id: dbId });
    const propCount = db.properties ? Object.keys(db.properties).length : 0;

    if (propCount > 1) {
      console.log(`✅ ${name}: ${propCount} properties (WORKING)`);
      console.log(`   Properties: ${Object.keys(db.properties).join(', ')}`);
    } else {
      console.log(`❌ ${name}: ${propCount} properties (LINKED VIEW - broken)`);
      if (db.data_sources?.length > 0) {
        console.log(`   Real ID: ${db.data_sources[0].id}`);
      }
    }
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
  }
}

async function testAll() {
  console.log('🧪 Testing all Notion Databases...\n');

  await testDatabase('Founders', process.env.NOTION_DATABASE_ID);
  await testDatabase('Forum', process.env.NOTION_FORUM_DATABASE_ID);
  await testDatabase('Votes', process.env.NOTION_VOTES_DATABASE_ID);
  await testDatabase('Transactions', process.env.NOTION_TRANSACTIONS_DATABASE_ID);
  await testDatabase('Announcements', process.env.NOTION_ANNOUNCEMENTS_DATABASE_ID);
  await testDatabase('Tasks', process.env.NOTION_TASKS_DATABASE_ID);
  await testDatabase('Documents', process.env.NOTION_DOCUMENTS_DATABASE_ID);
  await testDatabase('Events', process.env.NOTION_EVENTS_DATABASE_ID);
  await testDatabase('Groups', process.env.NOTION_GROUPS_DATABASE_ID);
}

testAll();
