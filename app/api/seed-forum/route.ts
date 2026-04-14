import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';

export async function GET() {
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
      content: '🤖 **Pro-Tipp: Dein AI Co-Founder**\n\nWusstet ihr schon? Unsere AI hier ist nicht einfach nur ein Chatbot.\n\nWenn ihr `@orion` in einem Post erwähnt, kennt er den Kontext des Beitrags. \n\nBeispiel: "Hey @orion, schreib mir mal 3 Hooks für mein Eco-Fashion Venture basierend auf meiner Zielgruppe."\n\nProbiert\'s mal aus! Spart echt Zeit.'
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

  try {
    const results = [];
    for (const post of posts) {
      // Add small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
      const res = await prisma.forumPost.create({
        data: {
          authorName: post.author,
          founderNumber: post.founderNumber,
          category: post.category,
          content: post.content
        }
      });
      results.push(res.id);
    }
    return NextResponse.json({ success: true, created: results.length, ids: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
