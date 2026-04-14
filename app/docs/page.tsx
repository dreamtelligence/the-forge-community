'use client';

import AuthGuard from '@/components/AuthGuard';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import {
  BookOpen,
  ShieldCheck,
  Newspaper,
  Globe,
} from 'lucide-react';

export default function DocsPage() {
  return (
    <AuthGuard>
      <PageShell contentClassName="flex-1 px-4 pb-24 pt-20 sm:px-6 lg:ml-64 lg:p-12 transition-all relative">
        <div className="mx-auto max-w-5xl space-y-16">
          {/* Header */}
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
              <BookOpen className="w-3.5 h-3.5" />
              Docs
            </div>
            <h1 className="text-4xl sm:text-5xl font-instrument-serif text-white">
              Workflow & Produkt-Dokumentation
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-3xl">
              Diese Seite zeigt dir den kompletten Ablauf: Wo du startest, wie du ein Venture aufsetzt,
              welche Studios du wann nutzt und welche Tools dich durch Launch und Scale tragen. Alle Bereiche,
              die es in der Plattform gibt, sind hier erklärt.
            </p>
            <div className="pt-2">
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/60 bg-[var(--accent)] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-black shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:brightness-110 hover:shadow-[0_0_32px_rgba(212,175,55,0.6)] transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                API Dokumentation öffnen
              </Link>
            </div>
          </header>

          {/* Workflow Summary */}
          <section className="space-y-3">
            <p className="text-sm text-white/60">Workflow in 4 Schritten:</p>
            <ol className="list-decimal pl-5 text-sm text-white/60 space-y-1">
              <li>Start & Zugang: Login, Founder Dossier, Credits und Grundsetup.</li>
              <li>Squad & Venture: Squad finden/erstellen und Venture Wizard durchlaufen.</li>
              <li>Forge Workspace: Dashboard, Brand DNA, Marketing, Sourcing, Legal, Decisions.</li>
              <li>AI & Media: Generator, Veo, Voice, Avatar, Forge Lab.</li>
            </ol>
          </section>

              {/* Start & Zugang */}
              <section id="start" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-instrument-serif text-white">Start & Zugang</h2>
                <p className="text-white/60">
                  Du startest über den Login (Magic Link oder Google OAuth). Nach dem ersten Login wirst du
                  in die App geführt und bekommst die ersten Credits für AI-Funktionen.
                </p>
            <p className="text-sm text-white/50">
              Tipp: Wenn du noch keine Venture-Struktur hast, starte zuerst mit dem Venture Wizard,
              damit deine Studios automatisch korrekt konfiguriert sind.
            </p>
          </section>

          {/* Founder Dossier */}
          <section id="profile" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Founder Dossier (Profil)</h2>
            <p className="text-white/60">
              Beim ersten Login wirst du gebeten, dein Founder Dossier zu vervollständigen. Das sorgt
              für bessere Matches in Squads und erleichtert die Zusammenarbeit.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Kontakt & Identität</li>
              <li>Skills & Rollen</li>
              <li>Öffentliches Profil für Squad-Discovery</li>
            </ul>
          </section>

          {/* Credits & Billing */}
          <section id="credits" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Credits & Billing</h2>
            <p className="text-white/60">
              AI-Features verbrauchen Credits (Energy). In den Billing Settings siehst du deinen aktuellen
              Stand, vergangene Grants und Rechnungen. Käufe laufen über die Pricing-Seite.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Billing & Abo</li>
              <li>Credits & Energy Transaktionen</li>
              <li>
                Pricing: <Link href="/pricing" className="underline text-white/70 hover:text-white">/pricing</Link>
              </li>
            </ul>
          </section>

          {/* Squads */}
          <section id="squads" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Squads</h2>
            <p className="text-white/60">
              Squads sind Teams von 2–5 Personen. Du kannst einem Squad beitreten, dich bewerben oder
              selbst einen Squad eröffnen. Rollen, Plätze und Status werden dort verwaltet.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Öffentliche & private Squads</li>
              <li>Rekrutierung & Bewerbungen</li>
              <li>Team-Status (Forming, Planning, Building, Launched)</li>
            </ul>
          </section>

          {/* Venture Wizard */}
          <section id="ventures" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Venture Wizard & Überblick</h2>
            <p className="text-white/60">
              Der Venture Wizard führt dich in 6 Schritten durch Setup und Ziele. Danach landest du im
              Venture-Überblick mit Tasks, Kosten, Timeline und direktem Zugang zum Forge Workspace.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Typ wählen (E-Commerce, SaaS, Service)</li>
              <li>Grunddaten & Markt</li>
              <li>Produkt/Service & Pricing</li>
              <li>Marketing-Budget & Launch-Datum</li>
            </ul>
          </section>

          {/* Forge Workspace */}
          <section id="forge" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Forge Workspace (Studios)</h2>
            <p className="text-white/60">
              Das Forge ist dein operatives HQ. Von hier aus steuerst du alle Studios. Das Dashboard zeigt
              Fortschritt, Tasks, Budget und schnelle Einstiege in die wichtigsten Bereiche.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-2">
              <li><strong className="text-white/80">Brand DNA:</strong> Markenidentität, Tonalität, Zielgruppe, Visuals und AI-Kontext.</li>
              <li><strong className="text-white/80">Marketing Studio:</strong> Copywriter, Kampagnen, Posts, Ads und Media.</li>
              <li><strong className="text-white/80">Sourcing Studio:</strong> Supplier-Discovery, Samples und Orders.</li>
              <li><strong className="text-white/80">Legal Studio:</strong> Vertragsvorlagen, Dokumente, Status-Tracking und Drafts.</li>
              <li><strong className="text-white/80">Decision Hall:</strong> Abstimmungen und Team-Votes mit Auswertung.</li>
              <li><strong className="text-white/80">Music & Sounds:</strong> Lizenzierte Musik und Soundeffekte.</li>
            </ul>
          </section>

          {/* AI Kommunikation */}
          <section id="ai" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">AI Kommunikation & Assistenz</h2>
            <p className="text-white/60">
              Der AI-Sidebar ist kontextsensitiv. Je nachdem, in welchem Studio du bist, setzt das System
              den Kontext automatisch und passt Antworten an.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Chat-Modus für normale Arbeitsschritte</li>
              <li>Recherche-Modus mit Web-Suche</li>
              <li>Supplier-Modus für Lieferanten-Recherche</li>
              <li>Faktencheck-Modus für Assertions</li>
              <li>Datei-Uploads als Kontext für AI-Antworten</li>
            </ul>
          </section>

          {/* Media Studio */}
          <section id="media" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Media Studio (Generator, Veo, Voice)</h2>
            <p className="text-white/60">
              Das Media Studio ist in Marketing integriert und zusätzlich als eigenständiges Studio verfügbar.
              Du kannst Assets direkt im Venture-Kontext oder ohne Venture erzeugen.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-2">
              <li><strong className="text-white/80">Generator:</strong> Bild- und Video-Assets per Prompt.</li>
              <li><strong className="text-white/80">Veo 3.1 + NanoBanana:</strong> Video- und Spezial-Generatoren.</li>
              <li><strong className="text-white/80">AI Voice & Avatar:</strong> Voiceover und Avatare.</li>
              <li><strong className="text-white/80">Forge Lab:</strong> Experimentelle Workflows.</li>
              <li><strong className="text-white/80">Library:</strong> Alle generierten Assets im Überblick.</li>
            </ul>
          </section>

          {/* Marketing */}
          <section id="marketing" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Marketing (Copy & Kampagnen)</h2>
            <p className="text-white/60">
              Im Marketing Studio gibt es zwei Workspaces: Media (Bilder/Video) und Copywriter (Text).
              Du kannst Content direkt einer Kampagne zuordnen.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Formate: Instagram, LinkedIn, X/Twitter, Blog, Newsletter, Ads</li>
              <li>Kampagnen-Manager mit Posts und Status</li>
              <li>Spezial-Tools: Character DNA, FaceSwap, LipSync</li>
            </ul>
          </section>

          {/* Sourcing */}
          <section id="sourcing" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Sourcing (Supplier, Samples, Orders)</h2>
            <p className="text-white/60">
              Das Sourcing Studio bündelt alles rund um Lieferanten und Produktion.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>AI Discovery: Lieferanten automatisch finden</li>
              <li>Netzwerk-Import & manuelle Lieferantenpflege</li>
              <li>Samples verwalten und Status tracken</li>
              <li>Orders anlegen und Produktionsstatus pflegen</li>
            </ul>
          </section>

          {/* Legal */}
          <section id="legal" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Legal (Verträge & Templates)</h2>
            <p className="text-white/60">
              Im Legal Studio wählst du Templates (NDA, Agreements, etc.) und generierst Verträge mit
              AI-Unterstützung basierend auf deiner Brand DNA.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Dokumenten-Status: Draft, Review, Sent, Signed</li>
              <li>Übersicht über alle Verträge pro Venture</li>
              <li>Neue Dokumente direkt aus Templates erzeugen</li>
              <li>Contract Risk Scanner im Communication-Bereich für PDF-Checks</li>
            </ul>
          </section>

          {/* Decisions */}
          <section id="decisions" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Decision Hall (Voting)</h2>
            <p className="text-white/60">
              Entscheidungen werden teamweit abgestimmt. Du kannst neue Votes starten, Deadline setzen
              und Ergebnisse transparent auswerten.
            </p>
          </section>

          {/* Music */}
          <section id="music" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Music & Sounds</h2>
            <p className="text-white/60">
              Lizenzierte Musik und Soundeffekte für deine Video-Assets, direkt im Forge verfügbar.
            </p>
          </section>

          {/* Community */}
          <section id="community" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Community & Kommunikation</h2>
            <p className="text-white/60">
              Die Community besteht aus Forum, Messages und dem Communication Bereich.
              Hier läuft Austausch, Feedback und Zusammenarbeit.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Forum: Diskussionen, Fragen, Feedback</li>
              <li>Messages: Direktnachrichten</li>
              <li>Communication: zentraler Kommunikationshub</li>
            </ul>
          </section>

          {/* Resources */}
          <section id="resources" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Resources / Academy</h2>
            <p className="text-white/60">
              Trainings, Playbooks und Guides findest du unter Resources. Dort kannst du nach Kategorie,
              Level und Themen filtern.
            </p>
          </section>

          {/* Tools */}
          <section id="tools" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Tools & Extras</h2>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-2">
              <li><strong className="text-white/80">Media Feed:</strong> Öffentliche Assets der Community.</li>
              <li><strong className="text-white/80">Calendar:</strong> Community-Events, Deadlines und Launch-Termine.</li>
              <li><strong className="text-white/80">Dashboard & Tasks:</strong> Aufgaben, Status und Fortschritt.</li>
              <li><strong className="text-white/80">Contract Scanner:</strong> PDF-Verträge analysieren und Antworten vorbereiten.</li>
            </ul>
          </section>

          {/* Settings */}
          <section id="settings" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Settings, Integrations & API</h2>
            <p className="text-white/60">
              Unter Settings verwaltest du Billing, API Keys und Integrationen.
            </p>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              <li>Billing & Credits</li>
              <li>Integrationen (z. B. Notion, DocuSign)</li>
              <li>
                API Docs: <Link href="/docs/api" className="underline text-white/70 hover:text-white">/docs/api</Link>
              </li>
            </ul>
          </section>

          {/* Updates & Transparency */}
          <section id="updates" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Updates & Transparency</h2>
            <p className="text-white/60">
              Updates liefern Changelogs, während Transparency Einblicke in Einnahmen, Ausgaben und
              Meilensteine der Community gibt.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/70">
                <Newspaper className="w-4 h-4" /> Updates
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/70">
                <Globe className="w-4 h-4" /> Transparency
              </span>
            </div>
          </section>

          {/* Admin */}
          <section id="admin" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Admin (nur Team)</h2>
            <p className="text-white/60">
              Admin-Bereiche sind nur für das interne Team sichtbar und umfassen User-Management,
              Finance und systemweite Trigger.
            </p>
          </section>

          {/* Demos */}
          <section id="demos" className="space-y-4 scroll-mt-24">
            <h2 className="text-3xl font-instrument-serif text-white">Demos & Prototypen</h2>
            <p className="text-white/60">
              Es gibt interne Demo-Seiten wie Demo Shop, Hero Demo oder Experiment-Seiten. Diese dienen
              zur Präsentation und zum Prototyping, sind aber nicht Teil des Kern-Workflows.
            </p>
          </section>

          {/* Footer */}
          <section className="space-y-3">
            <h3 className="text-2xl font-instrument-serif text-white">Noch Fragen?</h3>
            <p className="text-white/60">
              Starte im Venture Wizard oder im Forge Workspace. Wenn etwas fehlt, sag Bescheid –
              wir ergänzen die Doku direkt.
            </p>
            <p className="text-sm text-white/60">
              Links: <Link href="/ventures/new" className="underline text-white/70 hover:text-white">Venture starten</Link> ·{' '}
              <Link href="/ventures" className="underline text-white/70 hover:text-white">Forge öffnen</Link>
            </p>
          </section>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
