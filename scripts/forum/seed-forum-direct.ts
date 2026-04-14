console.log('Script started');
import { addForumPost } from '@/lib/integrations/notion';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root
console.log('Loading envs...');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
console.log('API Key present:', !!process.env.NOTION_API_KEY);

async function seed() {
  console.log('Seeding forum posts...');
  
  if (!process.env.NOTION_API_KEY) {
    console.error('Error: NOTION_API_KEY not found in env');
    process.exit(1);
  }

  const posts = [
    {
      author: 'Maximilian (Lead)',
      founderNumber: 1,
      category: 'General',
      content: '🚀 **Willkommen in der Forge!**\n\nHey Leute, mega dass ihr am Start seid. Dies ist unser Space, um gemeinsam an großen Dingen zu schrauben.\n\nStellt euch doch kurz vor: Wer seid ihr, was baut ihr, und wo braucht ihr Support?\n\nLet\'s build! 🔥'
    },
    {
      author: 'Sarah (AI Lead)',
      founderNumber: 2,
      category: 'Ideas',
      content: '🤖 **Pro-Tipp: Dein AI Co-Founder**\n\nWusstet ihr schon? Unsere AI hier ist nicht einfach nur ein Chatbot.\n\nWenn ihr `@forge-ai` in einem Post erwähnt, kennt sie bereits den Kontext eures Ventures (sofern ihr das wollt). \n\nBeispiel: "Hey @forge-ai, schreib mir mal 3 Hooks für mein Eco-Fashion Venture basierend auf meiner Zielgruppe."\n\nProbiert\'s mal aus! Spart echt Zeit.'
    },
    {
      author: 'Tom (Builder)',
      founderNumber: 42,
      category: 'Support',
      content: '⚖️ **Legal-Kram nervt?**\n\nKurzer Shoutout an das neue Legal Studio im Dashboard. Hab gestern in 2 Minuten ein NDA für meinen Freelancer erstellt.\n\nSpart euch den Anwalt für den Anfang. Einfach Template wählen, Daten rein, fertig. Hat mir gestern sicher 2 Stunden Kopfzerbrechen erspart. 😅'
    },
    {
      author: 'Lena (SaaS)',
      founderNumber: 15,
      category: 'General',
      content: '👋 **Wer baut noch B2B SaaS?**\n\nIch arbeite gerade an einem CRM für Handwerker. Suche noch Leute für gegenseitiges Feedback zu Landing Pages.\n\nWer Bock hat: Einfach kommentieren oder DM. Helfe gerne im Gegenzug bei Marketing-Themen!'
    }
  ];

  for (const post of posts) {
    console.log(`Creating post by ${post.author}...`);
    try {
      await addForumPost(post);
      console.log('✅ Success');
      // Delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error('❌ Failed:', e);
    }
  }
  
  console.log('Done!');
}

seed();