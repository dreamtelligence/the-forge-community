import Link from 'next/link';
import { BookOpen, Key, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'API-Schlüssel & Schnittstellen | The Forge',
  description: 'Aktueller Stand der API-Schlüsselverwaltung und externen Schnittstellen von The Forge.',
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/settings/api-keys" className="inline-block text-sm text-zinc-400 hover:text-white mb-6">
          ← Zur Schlüsselverwaltung
        </Link>
        <header className="mb-10">
          <BookOpen className="w-8 h-8 text-[#FF9900] mb-4" aria-hidden="true" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white">API-Schlüssel & Schnittstellen</h1>
          <p className="text-zinc-400 mt-4">Hier findest du den aktuellen Umfang des externen API-Zugangs.</p>
        </header>

        <section className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
            Externe Bildgenerierung noch nicht verfügbar
          </h2>
          <p className="text-zinc-300 mt-4">
            Die externe Generierungs-API ist nicht freigeschaltet. Anfragen an den Bild-Endpunkt
            werden mit HTTP 501 (NOT_IMPLEMENTED) beantwortet und buchen keine Credits ab.
          </p>
          <code className="block mt-4 text-xs sm:text-sm text-amber-300 break-all">
            POST /api/v1/media/generate-image
          </code>
          <p className="text-zinc-400 mt-4">
            Für Bild- und Videogenerierung nutze das Marketing-Studio deines Ventures.
            Weitere externe Endpunkte für Video, Inhalte und Ventures sind derzeit nicht verfügbar.
          </p>
          <Link href="/ventures" className="inline-block mt-4 text-sm text-[#FF9900] hover:underline">
            Zu deinen Ventures →
          </Link>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <Key className="w-5 h-5 text-[#FF9900]" aria-hidden="true" />
            Schlüssel verwalten
          </h2>
          <p className="text-zinc-400 mt-4">
            Angemeldete Nutzer können Schlüssel erstellen, Berechtigungen und Limits festlegen,
            die Nutzung einsehen und Schlüssel widerrufen. Ein Schlüssel schaltet keine noch
            nicht implementierten Schnittstellen frei.
          </p>
          <ul className="list-disc pl-5 mt-4 space-y-2 text-zinc-400">
            <li>Der vollständige Schlüssel wird nur bei der Erstellung angezeigt. Bewahre ihn sicher auf.</li>
            <li>Veröffentliche Schlüssel niemals im Browser-Code, in Screenshots oder in einem Repository.</li>
            <li>Vergib nur benötigte Berechtigungen und widerrufe nicht mehr verwendete Schlüssel.</li>
          </ul>
          <Link href="/settings/api-keys" className="inline-block mt-6 rounded-lg bg-[#FF9900] px-4 py-2 text-sm font-semibold text-black hover:brightness-110">
            API-Schlüssel verwalten
          </Link>
        </section>
      </div>
    </div>
  );
}
