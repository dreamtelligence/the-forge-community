import { Building2, Mail, Phone, AlertCircle } from 'lucide-react';

export default function ImpressumPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div>
        <h1 className="text-4xl md:text-6xl font-black mb-4">Impressum</h1>
        <p className="text-xl text-gray-400">
          Wir halten uns an deutsche Gesetze. Hier sind alle Infos, die du brauchst.
        </p>
      </div>

      {/* Transparency Note */}
      <div className="bg-gradient-to-r from-red-900/40 to-slate-900/40 border border-red-600/50 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold mb-2">Transparenz First</h3>
            <p className="text-gray-300">
              Das Impressum ist gesetzlich vorgeschrieben (§5 TMG). Wir gehen noch einen Schritt weiter:
              Alle 50 Founders bekommen Einblick in alle Finanzen, Verträge und Entscheidungen.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-red-600" />
          Angaben gemäß § 5 TMG
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-2">THE FORGE Community Brand Factory</h3>
            <p className="text-gray-400">
              [Dein vollständiger Name]<br />
              [Straße und Hausnummer]<br />
              [PLZ] [Stadt]<br />
              Deutschland
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-3">Kontakt</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-gray-400">
                <Mail className="w-5 h-5 text-red-600" />
                <a href="mailto:info@theforge.community" className="hover:text-white transition-colors">
                  info@theforge.community
                </a>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Phone className="w-5 h-5 text-red-600" />
                <span>[Deine Telefonnummer]</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-3">Umsatzsteuer-ID</h3>
            <p className="text-gray-400">
              Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br />
              <span className="text-white">[Deine USt-IdNr.]</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              (Falls noch nicht vorhanden: Wird nach Gründung beantragt)
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-3">Verantwortlich für den Inhalt</h3>
            <p className="text-gray-400">
              [Dein vollständiger Name]<br />
              [Adresse]
            </p>
          </div>
        </div>
      </div>

      {/* EU Dispute Resolution */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4">EU-Streitschlichtung</h2>
        <p className="text-gray-400 mb-4">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
        </p>
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 hover:underline"
        >
          https://ec.europa.eu/consumers/odr
        </a>
        <p className="text-gray-400 mt-4">
          Unsere E-Mail-Adresse findest du oben im Impressum.
        </p>
      </div>

      {/* Verbraucher­streit­beilegung */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4">Verbraucherstreitbeilegung</h2>
        <p className="text-gray-400">
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
        <p className="text-gray-400 mt-4">
          <span className="text-white font-bold">Aber ehrlich:</span> Wenn du ein Problem hast, schreib uns einfach.
          Wir lösen das direkt und transparent mit dir.
        </p>
      </div>

      {/* FAQ */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Häufige Fragen zum Impressum</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2">Warum steht hier eine Privatadresse?</h3>
            <p className="text-gray-400">
              THE FORGE ist (noch) kein eingetragenes Unternehmen. Sobald wir die 50 Founders haben
              und die GmbH gegründet ist, wird hier die Firmenadresse stehen.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Wer haftet für was?</h3>
            <p className="text-gray-400">
              Aktuell: Ich als Gründer. Nach GmbH-Gründung: Die GmbH mit dem Stammkapital.
              Alle Founders sind über den Gesellschaftervertrag abgesichert.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Kann ich die Adresse für offizielle Dokumente nutzen?</h3>
            <p className="text-gray-400">
              Ja, diese Adresse ist für alle rechtlichen Anfragen gültig. Nach Gründung wird
              die offizielle Geschäftsadresse hier stehen.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Message */}
      <div className="text-center bg-gradient-to-r from-red-900/20 to-slate-900/20 border border-red-600/30 rounded-2xl p-8">
        <p className="text-lg text-gray-300">
          <span className="text-white font-bold">Keine versteckten Infos.</span><br />
          Wenn du irgendwas wissen willst, frag einfach.
        </p>
      </div>
    </div>
  );
}
