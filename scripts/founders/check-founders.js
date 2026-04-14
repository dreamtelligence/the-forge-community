const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function check() {
  try {
    const dbId = process.env.NOTION_DATABASE_ID;
    console.log('Suche in Datenbank:', dbId);
    
    // Wir nutzen dataSources.query falls databases.query fehlt
    const queryFn = notion.databases.query ? notion.databases.query.bind(notion.databases) : notion.dataSources.query.bind(notion.dataSources);
    const paramKey = notion.databases.query ? 'database_id' : 'data_source_id';

    const response = await queryFn({ [paramKey]: dbId });
    
    console.log('\nRegistrierte Founder in Notion:');
    response.results.forEach(page => {
      const props = page.properties;
      const emailProp = Object.values(props).find(p => p.type === 'email');
      const nameProp = Object.values(props).find(p => p.type === 'title');
      
      const email = emailProp ? emailProp.email : 'KEINE EMAIL';
      const name = nameProp && nameProp.title[0] ? nameProp.title[0].plain_text : 'UNBEKANNT';
      
      console.log(`- ${name} (${email})`);
    });
  } catch (e) {
    console.error('Fehler:', e.message);
  }
}

check();
