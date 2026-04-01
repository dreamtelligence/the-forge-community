import { getForumPosts } from '../lib/notion';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local laden
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function analyzeForum() {
  console.log('\n🔍 FORUM SECURITY AUDIT\n');
  console.log('='.repeat(60));

  try {
    // Alle Posts abrufen
    console.log('\n📝 FORUM POSTS:');
    console.log('='.repeat(60));

    const posts = await getForumPosts();
    console.log(`\nAnzahl Posts: ${posts.length}\n`);

    if (posts.length === 0) {
      console.log('⚠️ Keine Posts gefunden. Entweder ist das Forum leer oder die API hat ein Problem.');
      return;
    }

    // Posts analysieren
    for (const post of posts) {
      console.log(`📌 Post ID: ${post.id}`);
      console.log(`   Autor: ${post.author} (Founder #${post.founderNumber})`);
      console.log(`   Kategorie: ${post.category}`);
      console.log(`   Likes: ${post.likes}`);
      console.log(`   Content: ${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}`);
      console.log(`   Erstellt: ${new Date(post.createdTime).toLocaleString('de-DE')}`);

      if (post.comments && post.comments.length > 0) {
        console.log(`   💬 ${post.comments.length} Kommentar(e):`);
        post.comments.forEach((comment: any, i: number) => {
          console.log(`      ${i + 1}. ${comment.author}: ${comment.content.slice(0, 60)}...`);
        });
      }

      console.log('-'.repeat(60));
    }

    // 3. Sicherheitsanalyse
    console.log('\n\n🔐 SICHERHEITSANALYSE:');
    console.log('='.repeat(60));

    // Prüfe ob Posts eine Email/Owner-Info haben
    const firstPost = posts[0];
    console.log('\n📋 POST-STRUKTUR (erster Post):');
    console.log(JSON.stringify(firstPost, null, 2));

    console.log('\n\n❌ KRITISCHE LÜCKEN gefunden:');
    console.log('  1. /api/forum/delete - KEINE Auth-Prüfung');
    console.log('  2. /api/forum/edit - KEINE Auth-Prüfung');
    console.log('  3. /api/forum/like - KEINE Auth-Prüfung');

    console.log('\n⚠️ STRUKTURELLE PROBLEME:');
    console.log('  - Posts haben nur "author" (Name), keine Email/User-ID');
    console.log('  - Kein "createdBy" oder "ownerEmail" Feld vorhanden');
    console.log('  - Frontend-Prüfung (user.name === post.author) ist unsicher');
    console.log('  - Jeder kann mit POST Request jeden Post löschen/editieren');

    console.log('\n✅ FUNKTIONIERT:');
    console.log('  - POST /api/forum: Hat Auth-Check (session.user.email)');
    console.log('  - POST /api/forum/comment: Hat Auth-Check');

    console.log('\n\n💡 LÖSUNGSVORSCHLAG:');
    console.log('  1. Neue Spalte "Owner Email" zur Forum-Datenbank hinzufügen');
    console.log('  2. Bei POST /api/forum die Email des Autors mit speichern');
    console.log('  3. Delete/Edit/Like Routes schützen:');
    console.log('     - Session-Check (ist User eingeloggt?)');
    console.log('     - Owner-Check (ist User der Autor?)');
    console.log('  4. Like-System: Pro User nur 1x up/down erlauben (Rate Limiting)');

    console.log('\n\n🔧 BEISPIEL FÜR SICHERE DELETE ROUTE:');
    console.log(`
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();

  // Post abrufen
  const posts = await getForumPosts();
  const post = posts.find(p => p.id === id);

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Owner-Check (Email-basiert)
  const founder = await getFounderByEmail(session.user.email);
  if (post.author !== founder?.name) {
    return NextResponse.json({ error: 'Forbidden: Not your post' }, { status: 403 });
  }

  // Jetzt darf gelöscht werden
  await deleteForumPost(id);
  return NextResponse.json({ success: true });
}
    `);

    console.log('\n\n🚨 DRINGLICHKEIT: HOCH');
    console.log('   Aktuell kann JEDER mit einem cURL Befehl ALLE Posts manipulieren!');
    console.log('   Beispiel: curl -X POST https://your-site.de/api/forum/delete \\');
    console.log('             -H "Content-Type: application/json" \\');
    console.log(`             -d '{"id": "${posts[0]?.id}"}'`);
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ FEHLER:', error.message);
    console.error(error);
  }
}

analyzeForum();
