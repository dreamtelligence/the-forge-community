import { Scale, Users, TrendingUp, Vote, Shield, AlertTriangle } from 'lucide-react';

export default function AGBPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div>
        <h1 className="text-4xl md:text-6xl font-black mb-4">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-xl text-gray-400">
          Die Spielregeln für THE FORGE. Fair, transparent, verständlich.
        </p>
      </div>

      {/* Core Principles */}
      <div className="bg-gradient-to-r from-red-900/40 to-slate-900/40 border border-red-600/50 rounded-2xl p-8">
        <h3 className="text-2xl font-bold mb-4">Die 3 Grundprinzipien</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <span className="text-red-600 text-2xl">1.</span>
            <span><strong className="text-white">Fair Play:</strong> Alle 50 Founders haben die gleichen Rechte</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-600 text-2xl">2.</span>
            <span><strong className="text-white">Transparenz:</strong> Jeder Euro, jede Entscheidung ist öffentlich</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-600 text-2xl">3.</span>
            <span><strong className="text-white">Community First:</strong> Die Mehrheit entscheidet</span>
          </div>
        </div>
      </div>

      {/* Section 1: The Deal */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Scale className="w-6 h-6 text-red-600" />
          §1 - Der Deal
        </h2>

        <div className="space-y-6 text-gray-400">
          <div>
            <h3 className="font-bold text-white mb-2">1.1 Was du bekommst</h3>
            <ul className="space-y-2 ml-4">
              <li>• <strong className="text-white">2% Ownership</strong> der ersten Brand (von 50 Founders = 100%)</li>
              <li>• <strong className="text-white">Stimmrecht</strong> bei allen wichtigen Entscheidungen</li>
              <li>• <strong className="text-white">50% Gewinnbeteiligung</strong> anteilig zu deinem Ownership</li>
              <li>• <strong className="text-white">Full Transparency</strong> zu allen Finanzen und Prozessen</li>
              <li>• <strong className="text-white">Founder-Status</strong> und Zugang zur Community</li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">1.2 Was du investierst</h3>
            <ul className="space-y-2 ml-4">
              <li>• <strong className="text-white">500€ einmalig</strong> als Kapitaleinlage</li>
              <li>• Zahlung innerhalb von <strong className="text-white">14 Tagen</strong> nach Annahme</li>
              <li>• Zahlungsmethoden: Banküberweisung, Stripe, PayPal</li>
              <li>• Nach Zahlungseingang: Offizieller Founder-Status</li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">1.3 Rechtliche Form</h3>
            <p>
              Sobald alle 50 Founders beisammen sind, gründen wir eine <strong className="text-white">GmbH</strong>.
              Bis dahin läuft alles über mich als Einzelunternehmer. Alle Investments werden auf einem
              <strong className="text-white"> separaten Treuhandkonto</strong> verwahrt.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Rights & Responsibilities */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Users className="w-6 h-6 text-red-600" />
          §2 - Deine Rechte & Pflichten
        </h2>

        <div className="space-y-6 text-gray-400">
          <div>
            <h3 className="font-bold text-white mb-3">2.1 Deine Rechte</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <strong className="text-white block mb-2">Stimmrecht</strong>
                <p className="text-sm">1 Founder = 1 Vote. Bei allen wichtigen Entscheidungen.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <strong className="text-white block mb-2">Gewinnbeteiligung</strong>
                <p className="text-sm">Anteilig 2% der Gewinne, quartalsweise ausgezahlt.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <strong className="text-white block mb-2">Transparenz</strong>
                <p className="text-sm">Zugang zum kompletten Dashboard mit allen Zahlen.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <strong className="text-white block mb-2">Exit-Option</strong>
                <p className="text-sm">Du kannst verkaufen (nach 6 Monaten Haltefrist).</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-3">2.2 Deine Pflichten</h3>
            <ul className="space-y-2 ml-4">
              <li>• <strong className="text-white">Aktive Teilnahme:</strong> Bei Votings abstimmen (Minimum 70% Teilnahme)</li>
              <li>• <strong className="text-white">Respektvoller Umgang:</strong> Mit anderen Founders in der Community</li>
              <li>• <strong className="text-white">Vertraulichkeit:</strong> Interne Infos bleiben intern</li>
              <li>• <strong className="text-white">Fair Play:</strong> Keine Manipulation, kein Spamming</li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-3">2.3 Was passiert bei Regelverstößen?</h3>
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
              <p className="text-gray-300">
                <strong className="text-yellow-500">Warnsystem:</strong><br />
                1. Warnung → 2. Warnung → 3. Ausschluss (nach Community-Vote)<br />
                Bei Ausschluss: Auszahlung deines Anteils zum aktuellen Wert.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Voting & Decisions */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Vote className="w-6 h-6 text-red-600" />
          §3 - Abstimmungen & Entscheidungen
        </h2>

        <div className="space-y-6 text-gray-400">
          <div>
            <h3 className="font-bold text-white mb-2">3.1 Was wird abgestimmt?</h3>
            <ul className="space-y-2 ml-4">
              <li>• Produktauswahl (Welche Brand bauen wir?)</li>
              <li>• Supplier-Wahl (Wer produziert?)</li>
              <li>• Design-Entscheidungen (Logo, Packaging, etc.)</li>
              <li>• Marketing-Budget (Wie viel investieren wir?)</li>
              <li>• Große Ausgaben (über 2.000€)</li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">3.2 Abstimmungsregeln</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <strong className="text-white block mb-2">Einfache Mehrheit (&gt;50%)</strong>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Produktauswahl</li>
                  <li>• Design-Entscheidungen</li>
                  <li>• Marketing-Kampagnen</li>
                </ul>
              </div>
              <div>
                <strong className="text-white block mb-2">Qualifizierte Mehrheit (&gt;66%)</strong>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Änderung der AGB</li>
                  <li>• Founder-Ausschluss</li>
                  <li>• Verkauf der Brand</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">3.3 Voting-Zeitraum</h3>
            <p>
              Jede Abstimmung läuft <strong className="text-white">7 Tage</strong>. Du bekommst eine E-Mail + Push-Notification.
              Nicht abstimmen = Enthaltung (zählt NICHT für Mehrheit).
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Profit Distribution */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-red-600" />
          §4 - Gewinnverteilung
        </h2>

        <div className="space-y-6 text-gray-400">
          <div>
            <h3 className="font-bold text-white mb-2">4.1 Die 50/50 Regel</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="mb-4">Von allen Gewinnen (nach Abzug aller Kosten):</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                  <strong className="text-green-500 block mb-2">50% an Founders</strong>
                  <p className="text-sm">Aufgeteilt auf alle 50 = 1% pro Founder</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                  <strong className="text-blue-500 block mb-2">50% an Operations</strong>
                  <p className="text-sm">Für Reinvestment, neue Brands, Wachstum</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">4.2 Auszahlung</h3>
            <ul className="space-y-2 ml-4">
              <li>• <strong className="text-white">Quartalsweise</strong> (Ende März, Juni, September, Dezember)</li>
              <li>• Automatische Überweisung auf dein hinterlegtes Konto</li>
              <li>• Detaillierter Report vorab (alle Zahlen, alle Kosten)</li>
              <li>• Mindestbetrag: 10€ (sonst Übertrag ins nächste Quartal)</li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">4.3 Steuern</h3>
            <p>
              Du zahlst <strong className="text-white">Kapitalertragssteuer</strong> auf deine Gewinne (25% + Soli).
              Wir schicken dir alle Infos für deine Steuererklärung.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5: Exit & Transfer */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-600" />
          §5 - Exit & Übertragung
        </h2>

        <div className="space-y-6 text-gray-400">
          <div>
            <h3 className="font-bold text-white mb-2">5.1 Verkaufen deines Anteils</h3>
            <ul className="space-y-2 ml-4">
              <li>• <strong className="text-white">Haltefrist:</strong> Minimum 6 Monate nach Investment</li>
              <li>• <strong className="text-white">Vorkaufsrecht:</strong> Andere Founders haben Vorrang</li>
              <li>• <strong className="text-white">Preis:</strong> Aktueller Unternehmenswert ÷ 50</li>
              <li>• <strong className="text-white">Prozess:</strong> Über Platform, transparent für alle</li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">5.2 Rücktritt</h3>
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
              <p>
                <strong className="text-white">Innerhalb von 14 Tagen:</strong> Volle Rückerstattung (500€)<br />
                <strong className="text-white">Nach 14 Tagen:</strong> Verkauf zum aktuellen Wert (kann mehr oder weniger sein)
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">5.3 Was passiert beim Todesfall?</h3>
            <p>
              Dein Anteil geht an deine Erben. Sie können ihn behalten oder verkaufen.
              Keine Gebühren, kein Stress.
            </p>
          </div>
        </div>
      </div>

      {/* Section 6: Liability */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          §6 - Haftung & Risiken
        </h2>

        <div className="space-y-6 text-gray-400">
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6">
            <h3 className="font-bold text-white mb-3">Wichtig zu wissen:</h3>
            <ul className="space-y-2">
              <li>• <strong className="text-white">Risiko:</strong> Du kannst deine 500€ verlieren (wenn Brand floppt)</li>
              <li>• <strong className="text-white">Keine Garantie:</strong> Wir versprechen keine Gewinne</li>
              <li>• <strong className="text-white">Haftungsbeschränkung:</strong> Maximum = dein Investment (500€)</li>
              <li>• <strong className="text-white">Unternehmerisches Risiko:</strong> Das ist kein Sparbuch, sondern ein Investment</li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold text-white mb-2">Was wir garantieren:</h3>
            <ul className="space-y-2 ml-4">
              <li>• 100% Transparenz über alle Ausgaben</li>
              <li>• Faire Behandlung aller Founders</li>
              <li>• Demokratische Entscheidungen</li>
              <li>• Dass wir unser Bestes geben</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 7: Final Provisions */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">§7 - Schlussbestimmungen</h2>

        <div className="space-y-4 text-gray-400">
          <div>
            <h3 className="font-bold text-white mb-2">7.1 Änderungen der AGB</h3>
            <p>
              Änderungen brauchen <strong className="text-white">66% Zustimmung</strong> aller Founders.
              Du wirst 30 Tage vorher informiert.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="font-bold text-white mb-2">7.2 Streitbeilegung</h3>
            <p>
              Bei Konflikten: Erst reden. Dann Mediator. Als letztes Gericht.
              Gerichtsstand: [Deine Stadt], Deutschland.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="font-bold text-white mb-2">7.3 Salvatorische Klausel</h3>
            <p>
              Falls eine Bestimmung unwirksam ist, bleiben die anderen gültig.
              Standard-Juristenkram halt.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Häufige Fragen</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2">Kann ich mehrere Anteile kaufen?</h3>
            <p className="text-gray-400">
              Nein. 1 Person = 1 Founder-Spot = 2%. Das ist fair für alle.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Was wenn ich länger krank bin und nicht voten kann?</h3>
            <p className="text-gray-400">
              Sag Bescheid. Wir sind Menschen, keine Roboter. Bei längerer Abwesenheit
              gibt's eine Pause-Funktion.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Kann THE FORGE pleite gehen?</h3>
            <p className="text-gray-400">
              Theoretisch ja. Dann: Liquidation, Schulden zahlen, Rest verteilen auf Founders.
              Aber wir tun alles um das zu verhindern.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-bold mb-2">Was passiert wenn ihr mehr als eine Brand baut?</h3>
            <p className="text-gray-400">
              Die 50 Founders der ersten Brand bekommen Vorzug bei der zweiten Brand (reduzierter Preis).
              Details folgen wenn es soweit ist.
            </p>
          </div>
        </div>
      </div>

      {/* Acceptance */}
      <div className="bg-gradient-to-r from-red-900/40 to-slate-900/40 border border-red-600/50 rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold mb-4">Verstanden?</h3>
        <p className="text-gray-300 mb-6">
          Mit deiner Zahlung der 500€ akzeptierst du diese AGB automatisch.<br />
          Innerhalb von 14 Tagen kannst du kostenlos zurücktreten.
        </p>
        <p className="text-sm text-gray-500">
          Stand: Januar 2026 • Version 1.0
        </p>
      </div>
    </div>
  );
}
