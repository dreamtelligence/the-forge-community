import { Shield, Database, Lock, Eye, Trash2, AlertCircle } from 'lucide-react';

export default function DatenschutzPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div>
        <h1 className="text-4xl md:text-6xl font-black mb-4">Datenschutzerklärung</h1>
        <p className="text-xl text-gray-400">
          Deine Daten gehören dir. Punkt. Hier erfährst du genau, was wir mit ihnen machen.
        </p>
      </div>

      {/* DSGVO Principles */}
      <div className="bg-gradient-to-r from-green-900/40 to-slate-900/40 border border-green-600/50 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold mb-2">Unsere Prinzipien</h3>
            <ul className="space-y-2 text-gray-300">
              <li>✓ Wir sammeln nur, was wir wirklich brauchen</li>
              <li>✓ Wir verkaufen NIEMALS deine Daten</li>
              <li>✓ Du kannst jederzeit alles löschen lassen</li>
              <li>✓ Alle Founders-Daten sind verschlüsselt gespeichert</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Responsible Party */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Verantwortlicher</h2>
        <p className="text-gray-400">
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:
        </p>
        <div className="mt-4 text-gray-300">
          <p>
            [Dein vollständiger Name]<br />
            [Straße und Hausnummer]<br />
            [PLZ] [Stadt]<br />
            Deutschland
          </p>
          <p className="mt-4">
            E-Mail: <a href="mailto:datenschutz@theforge.community" className="text-red-600 hover:underline">datenschutz@theforge.community</a>
          </p>
        </div>
      </div>

      {/* Data We Collect */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Database className="w-6 h-6 text-red-600" />
          Welche Daten wir sammeln
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-3">Bei der Bewerbung als Founder:</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">Name:</strong> Um dich zu identifizieren</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">E-Mail:</strong> Um mit dir zu kommunizieren</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">Telefon:</strong> Für wichtige Rückfragen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">Instagram Handle:</strong> Um dein Profil zu checken</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">Motivation:</strong> Warum du mitmachen willst</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-lg mb-3">Automatisch erfasste Daten:</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">IP-Adresse:</strong> Technisch notwendig für Website-Betrieb</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">Browser-Info:</strong> Um die Seite korrekt anzuzeigen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span><strong className="text-white">Zugriffszeitpunkt:</strong> Für Sicherheit und Error-Tracking</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* How We Use Data */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Eye className="w-6 h-6 text-red-600" />
          Wofür wir deine Daten nutzen
        </h2>

        <div className="space-y-4 text-gray-400">
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">1. Founder-Auswahl & Onboarding</h3>
            <p>Um deine Bewerbung zu prüfen und dich als Founder anzulegen.</p>
            <p className="text-sm text-gray-500 mt-2">Rechtsgrundlage: Vertragsanbahnung (Art. 6 Abs. 1 lit. b DSGVO)</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">2. Kommunikation</h3>
            <p>Um dich über Updates, Votings und wichtige Entscheidungen zu informieren.</p>
            <p className="text-sm text-gray-500 mt-2">Rechtsgrundlage: Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">3. Transparenz Dashboard</h3>
            <p>Dein Name erscheint bei Investments & Transaktionen, die du tätigst.</p>
            <p className="text-sm text-gray-500 mt-2">Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">4. Rechtliche Verpflichtungen</h3>
            <p>Für Verträge, Steuer, Buchhaltung - die Basics halt.</p>
            <p className="text-sm text-gray-500 mt-2">Rechtsgrundlage: Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO)</p>
          </div>
        </div>
      </div>

      {/* Third Party Services */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Lock className="w-6 h-6 text-red-600" />
          Externe Dienste die wir nutzen
        </h2>

        <div className="space-y-6">
          <div className="border-l-4 border-red-600 pl-6">
            <h3 className="font-bold text-lg mb-2">Notion (Datenbank)</h3>
            <p className="text-gray-400 mb-2">
              Wir speichern Founder-Daten in Notion (US-Unternehmen).
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Notion Labs Inc., 2300 Harrison Street, San Francisco, CA 94110, USA</li>
              <li>• Datenübermittlung in die USA auf Basis von EU-Standardvertragsklauseln</li>
              <li>• Datenschutzerklärung: <a href="https://www.notion.so/de-de/privacy" target="_blank" className="text-red-600 hover:underline">notion.so/privacy</a></li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-600 pl-6">
            <h3 className="font-bold text-lg mb-2">Vercel (Hosting)</h3>
            <p className="text-gray-400 mb-2">
              Diese Website läuft auf Vercel (US-Unternehmen).
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA</li>
              <li>• Datenübermittlung in die USA auf Basis von EU-Standardvertragsklauseln</li>
              <li>• Datenschutzerklärung: <a href="https://vercel.com/legal/privacy-policy" target="_blank" className="text-red-600 hover:underline">vercel.com/privacy</a></li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-600 pl-6">
            <h3 className="font-bold text-lg mb-2">Tally (Bewerbungsformular)</h3>
            <p className="text-gray-400 mb-2">
              Bewerbungen laufen über Tally Forms (EU-konform).
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Tally, Bruxelles, Belgien (EU)</li>
              <li>• DSGVO-konform, Server in der EU</li>
              <li>• Datenschutzerklärung: <a href="https://tally.so/help/privacy-policy" target="_blank" className="text-red-600 hover:underline">tally.so/privacy</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Your Rights */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-red-600" />
          Deine Rechte
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">→</span>
            <div>
              <h3 className="font-bold mb-1">Auskunft (Art. 15 DSGVO)</h3>
              <p className="text-gray-400">Wir sagen dir genau, welche Daten wir von dir haben.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">→</span>
            <div>
              <h3 className="font-bold mb-1">Berichtigung (Art. 16 DSGVO)</h3>
              <p className="text-gray-400">Falsche Daten? Wir korrigieren sie sofort.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">→</span>
            <div>
              <h3 className="font-bold mb-1">Löschung (Art. 17 DSGVO)</h3>
              <p className="text-gray-400">Du willst raus? Wir löschen alles (außer rechtlich Notwendiges).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">→</span>
            <div>
              <h3 className="font-bold mb-1">Datenübertragbarkeit (Art. 20 DSGVO)</h3>
              <p className="text-gray-400">Du bekommst deine Daten als Download (JSON/CSV).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">→</span>
            <div>
              <h3 className="font-bold mb-1">Widerspruch (Art. 21 DSGVO)</h3>
              <p className="text-gray-400">Du kannst der Verarbeitung widersprechen.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">→</span>
            <div>
              <h3 className="font-bold mb-1">Beschwerde</h3>
              <p className="text-gray-400">Bei der Datenschutzbehörde deines Bundeslandes.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
          <p className="text-gray-300">
            <span className="font-bold text-white">So einfach geht's:</span><br />
            E-Mail an <a href="mailto:datenschutz@theforge.community" className="text-red-600 hover:underline">datenschutz@theforge.community</a> mit deinem Anliegen.
            Antwort binnen 48h.
          </p>
        </div>
      </div>

      {/* Data Security */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Wie wir deine Daten schützen</h2>

        <div className="space-y-4 text-gray-400">
          <div className="flex items-start gap-3">
            <span className="text-green-600">✓</span>
            <span><strong className="text-white">HTTPS/SSL:</strong> Alle Verbindungen verschlüsselt</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-600">✓</span>
            <span><strong className="text-white">Zugriffskontrolle:</strong> Nur ich und autorisierte Tools</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-600">✓</span>
            <span><strong className="text-white">Regelmäßige Backups:</strong> Aber auch verschlüsselt</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-600">✓</span>
            <span><strong className="text-white">Keine Weitergabe:</strong> An niemanden, niemals</span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Häufige Fragen</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2">Seht ihr andere Founders meine persönlichen Daten?</h3>
            <p className="text-gray-400">
              Nein. Andere Founders sehen nur deinen Namen und Founder-Nummer im Dashboard.
              E-Mail, Telefon, etc. bleiben privat.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Was passiert mit meinen Daten wenn ich aussteige?</h3>
            <p className="text-gray-400">
              Wir löschen alles außer: Name + Investment-Betrag (für Buchhaltung, 10 Jahre Aufbewahrungspflicht).
              Alles andere weg.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Nutzt ihr Cookies?</h3>
            <p className="text-gray-400">
              Aktuell nur technisch notwendige (Session-Cookies für Login). Kein Tracking, keine Analytics.
              Falls sich das ändert, fragen wir vorher.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Wer hat Zugriff auf die Notion-Datenbank?</h3>
            <p className="text-gray-400">
              Nur ich (Gründer). Nach GmbH-Gründung: Ich + Steuerberater + ggf. ein Admin-Founder.
              Alle mit Vertraulichkeitsvereinbarung.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Message */}
      <div className="text-center bg-gradient-to-r from-red-900/20 to-slate-900/20 border border-red-600/30 rounded-2xl p-8">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <p className="text-lg text-gray-300">
          <span className="text-white font-bold">Deine Daten sind sicher.</span><br />
          Wenn du Fragen hast, schreib uns einfach.
        </p>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Stand: Januar 2026
      </div>
    </div>
  );
}
