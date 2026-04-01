import { FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';

export default function VertragPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div>
        <h1 className="text-4xl md:text-6xl font-black mb-4">Founder-Vertrag</h1>
        <p className="text-xl text-gray-400">
          Der offizielle Vertrag zwischen dir und THE FORGE. Schwarz auf weiß.
        </p>
      </div>

      {/* Download CTA */}
      <div className="bg-gradient-to-r from-red-900/40 to-slate-900/40 border border-red-600/50 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <FileText className="w-12 h-12 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-bold mb-2">Vertrag als PDF herunterladen</h3>
              <p className="text-gray-300">
                Lies ihn in Ruhe durch. Zeig ihn deinem Anwalt. Keine Eile.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg transition-colors font-bold whitespace-nowrap">
            <Download className="w-5 h-5" />
            PDF Download
          </button>
        </div>
      </div>

      {/* What's in the contract */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Was steht im Vertrag?</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Deine Rechte</h3>
              <p className="text-gray-400 text-sm">2% Ownership, Stimmrecht, volle Gewinnbeteiligung</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Deine Pflichten</h3>
              <p className="text-gray-400 text-sm">500€ Investment, aktive Teilnahme, Fair Play</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Ertrag & Verwendung</h3>
              <p className="text-gray-400 text-sm">100% der Netto-Gewinne an Founder; Verwendung frei (Reinvest/Entnahme)</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Exit-Regelung</h3>
              <p className="text-gray-400 text-sm">Verkauf nach 6 Monaten, Vorkaufsrecht</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Haftungsbeschränkung</h3>
              <p className="text-gray-400 text-sm">Maximum = dein Investment (500€)</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Transparenzpflicht</h3>
              <p className="text-gray-400 text-sm">Alle Finanzen öffentlich, kein Kleingedrucktes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Preview */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Vertrags-Vorschau</h2>

        <div className="bg-white text-black p-8 rounded-lg font-serif max-h-[600px] overflow-y-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">FOUNDER-BETEILIGUNGSVERTRAG</h1>
            <p className="text-gray-600">THE FORGE Community Brand Factory</p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-xl font-bold mb-3">Präambel</h2>
              <p className="mb-4">
                THE FORGE ist eine Community-basierte Brand Factory, die es 50 Personen ermöglicht,
                gemeinsam Consumer Brands aufzubauen und anteilig an deren Erfolg teilzuhaben.
                Dieser Vertrag regelt die Beteiligung als Founder.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§1 Vertragsparteien</h2>
              <div className="mb-4 pl-4">
                <p className="mb-2"><strong>Zwischen:</strong></p>
                <p className="mb-2">
                  [Dein vollständiger Name]<br />
                  [Adresse]<br />
                  (nachfolgend „THE FORGE" genannt)
                </p>
                <p className="mt-4 mb-2"><strong>und</strong></p>
                <p>
                  [Name des Founders]<br />
                  [Adresse des Founders]<br />
                  (nachfolgend „Founder" genannt)
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§2 Gegenstand des Vertrages</h2>
              <div className="pl-4 space-y-3">
                <p><strong>2.1</strong> Der Founder erwirbt durch Zahlung von 500€ (fünfhundert Euro) eine
                   Beteiligung von 2% an der ersten durch THE FORGE aufgebauten Brand.</p>
                <p><strong>2.2</strong> Die Beteiligung wird nach Gründung einer GmbH in
                   Gesellschaftsanteile umgewandelt.</p>
                <p><strong>2.3</strong> Bis zur GmbH-Gründung werden Einzahlungen durch die Squad
                   eigenständig verwaltet. Der Betreiber übernimmt keine treuhänderische Verwaltung.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§3 Rechte des Founders</h2>
              <div className="pl-4 space-y-3">
                <p><strong>3.1 Ownership:</strong> 2% Beteiligung an der ersten Brand (1 von 50 Founders)</p>
                <p><strong>3.2 Stimmrecht:</strong> 1 Vote bei allen wichtigen Entscheidungen (Produkt,
                   Supplier, Design, Marketing-Budget, große Ausgaben)</p>
                <p><strong>3.3 Gewinnbeteiligung:</strong> Anteilige Beteiligung an 100% aller Gewinne,
                   Auszahlung gemäß Squad-Entscheid</p>
                <p><strong>3.4 Transparenz:</strong> Vollständiger Zugang zum Transparency Dashboard
                   mit allen Finanzen</p>
                <p><strong>3.5 Exit-Option:</strong> Verkaufsmöglichkeit nach 6 Monaten Haltefrist,
                   Vorkaufsrecht für andere Founders</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§4 Pflichten des Founders</h2>
              <div className="pl-4 space-y-3">
                <p><strong>4.1 Investment:</strong> Zahlung von 500€ innerhalb von 14 Tagen nach
                   Vertragsschluss</p>
                <p><strong>4.2 Aktive Teilnahme:</strong> Mindestens 70% Teilnahme an Abstimmungen</p>
                <p><strong>4.3 Vertraulichkeit:</strong> Interne Informationen bleiben vertraulich</p>
                <p><strong>4.4 Fair Play:</strong> Respektvoller Umgang mit anderen Founders,
                   keine Manipulation</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§5 Ertrag & Verwendung</h2>
              <div className="pl-4 space-y-3">
                <p><strong>5.1</strong> Von allen Gewinnen (nach Abzug aller Kosten) stehen 100%
                   den Founders zu. Die Founder entscheiden eigenständig über Reinvestition oder Auszahlung.</p>
                <p><strong>5.2</strong> Die Gewinnanteile werden gemäß Beteiligungsschlüssel innerhalb der Squad verteilt.</p>
                <p><strong>5.3</strong> Auszahlungen erfolgen nach interner Squad-Regelung auf das hinterlegte Bankkonto.</p>
                <p><strong>5.4</strong> Mindestbetrag pro Auszahlung: 10€ (sofern die Squad dies vorsieht).</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§6 Abstimmungen</h2>
              <div className="pl-4 space-y-3">
                <p><strong>6.1</strong> Einfache Mehrheit (&gt;50%): Produktauswahl, Design,
                   Marketing-Kampagnen</p>
                <p><strong>6.2</strong> Qualifizierte Mehrheit (&gt;66%): AGB-Änderungen,
                   Founder-Ausschluss, Verkauf der Brand</p>
                <p><strong>6.3</strong> Voting-Zeitraum: 7 Tage. Enthaltungen zählen nicht zur Mehrheit.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§7 Haftung</h2>
              <div className="pl-4 space-y-3">
                <p><strong>7.1</strong> Die Haftung des Founders ist auf das Investment (500€) beschränkt.</p>
                <p><strong>7.2</strong> THE FORGE haftet nicht für Verluste oder entgangene Gewinne.</p>
                <p><strong>7.3</strong> Bei grober Fahrlässigkeit oder Vorsatz gelten die
                   gesetzlichen Haftungsregeln.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§8 Kündigung & Exit</h2>
              <div className="pl-4 space-y-3">
                <p><strong>8.1</strong> Ein gesetzliches Widerrufsrecht besteht für Unternehmer nicht.</p>
                <p><strong>8.2</strong> Exit durch Verkauf zum aktuellen Unternehmenswert gemäß Squad-Regelung.</p>
                <p><strong>8.3</strong> Haltefrist: Minimum 6 Monate (sofern squad-intern nichts anderes beschlossen wird).</p>
                <p><strong>8.4</strong> Vorkaufsrecht: Andere Founders haben bei Verkauf Vorrang.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">§9 Schlussbestimmungen</h2>
              <div className="pl-4 space-y-3">
                <p><strong>9.1</strong> Änderungen des Vertrages bedürfen der Schriftform und
                   66% Zustimmung aller Founders.</p>
                <p><strong>9.2</strong> Sollten einzelne Bestimmungen unwirksam sein, bleibt
                   der restliche Vertrag gültig.</p>
                <p><strong>9.3</strong> Es gilt deutsches Recht.</p>
                <p><strong>9.4</strong> Gerichtsstand ist [Deine Stadt], Deutschland.</p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="mb-2">_______________________</p>
                  <p className="text-sm">Ort, Datum</p>
                  <p className="mt-4 mb-2">_______________________</p>
                  <p className="text-sm">Unterschrift THE FORGE</p>
                </div>
                <div>
                  <p className="mb-2">_______________________</p>
                  <p className="text-sm">Ort, Datum</p>
                  <p className="mt-4 mb-2">_______________________</p>
                  <p className="text-sm">Unterschrift Founder</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-gray-300 text-sm">
            <strong className="text-yellow-500">Hinweis:</strong> Dies ist eine Vorschau.
            Der finale Vertrag wird von einem Anwalt geprüft und notariell beglaubigt.
          </p>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          Wichtig zu wissen
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">1.</span>
            <div>
              <h3 className="font-bold mb-1">Lass den Vertrag prüfen</h3>
              <p className="text-gray-400">
                Zeig ihn deinem Anwalt. Wir wollen, dass du dich sicher fühlst.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">2.</span>
            <div>
              <h3 className="font-bold mb-1">14 Tage Widerrufsrecht</h3>
              <p className="text-gray-400">
                Du kannst innerhalb von 14 Tagen ohne Angabe von Gründen zurücktreten.
                Geld zurück, keine Fragen.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">3.</span>
            <div>
              <h3 className="font-bold mb-1">Notarielle Beglaubigung</h3>
              <p className="text-gray-400">
                Nach GmbH-Gründung wird der Vertrag notariell beglaubigt.
                Kosten übernimmt THE FORGE.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-red-600 text-xl">4.</span>
            <div>
              <h3 className="font-bold mb-1">Digitale Unterschrift</h3>
              <p className="text-gray-400">
                Du kannst digital signieren (rechtsgültig) oder per Post schicken.
                Beides okay.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Häufige Fragen zum Vertrag</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2">Muss ich den Vertrag unterschreiben bevor ich zahle?</h3>
            <p className="text-gray-400">
              Ja. Erst unterschreiben, dann zahlen. So bist du rechtlich abgesichert.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Was wenn ich den Vertrag nicht verstehe?</h3>
            <p className="text-gray-400">
              Schreib uns. Wir erklären dir alles in einem 1:1 Call. Oder frag deinen Anwalt.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Kann ich den Vertrag verhandeln?</h3>
            <p className="text-gray-400">
              Die Grundbedingungen sind für alle gleich (Fairness). Bei speziellen Fällen
              (z.B. Firmenbeteiligung statt privat) können wir reden.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Wo werden die unterschriebenen Verträge aufbewahrt?</h3>
            <p className="text-gray-400">
              Verschlüsselt in der Cloud + physische Kopien beim Notar.
              Du bekommst auch eine Kopie.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-red-900/40 to-slate-900/40 border border-red-600/50 rounded-2xl p-8">
        <h3 className="text-2xl font-bold mb-4">Bereit zu unterschreiben?</h3>
        <p className="text-gray-300 mb-6">
          Lade den Vertrag runter, lies ihn in Ruhe, und wenn alles klar ist:<br />
          Wir sehen uns als Founder.
        </p>
        <button className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg transition-colors font-bold mx-auto">
          <Download className="w-5 h-5" />
          Vertrag als PDF herunterladen
        </button>
      </div>
    </div>
  );
}
