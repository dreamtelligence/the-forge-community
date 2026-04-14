const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const targetEmail = 'info@stakeandscale.de';

async function findDatabase() {
  console.log(`🔍 Suche nach ${targetEmail} in allen Notion-Quellen...`);
  
  try {
    const search = await notion.search({ filter: { property: 'object', value: 'data_source' } });
    const ids = search.results.map(r => r.id);
    
    for (const id of ids) {
      try {
                const query = await notion.dataSources.query({ 
                  data_source_id: id,
        
          page_size: 100 // Wir schauen uns die ersten 100 Einträge an
        });
        
        const found = query.results.find(page => {
          const props = page.properties;
          return Object.values(props).some(p => p.type === 'email' && p.email === targetEmail);
        });
        
        if (found) {
          console.log(`\n✅ TREFFER GEFUNDEN!`);
          console.log(`Datenbank ID: ${id}`);
          console.log(`Eintrag Name: ${found.properties.Name?.title[0]?.plain_text || 'Unbenannt'}`);
          process.exit(0);
        } else {
          process.stdout.write('.'); // Fortschrittsanzeige
        }
      } catch (_e) {
        // Einige Quellen könnten leer sein oder andere Strukturen haben
      }
    }
    console.log('\n❌ Keine Datenbank mit dieser Email gefunden.');
  } catch (error) {
    console.error('Fehler bei der Suche:', error.message);
  }
}

findDatabase();
