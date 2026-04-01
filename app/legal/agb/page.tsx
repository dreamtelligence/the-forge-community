import { Zap, AlertTriangle, Shield, Check } from 'lucide-react';

export default function AGBPage() {
  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <h2 className="text-4xl md:text-5xl text-white mb-4">Allgemeine Geschäftsbedingungen</h2>
        <p className="text-lg text-white/50 leading-relaxed">
          STAKE & SCALE – THE FORGE • Stand: Februar 2026 • Version 2.0
        </p>
      </section>

      <section className="glass-card border border-[var(--accent)]/20 bg-[var(--accent)]/[0.02] rounded-3xl p-8 relative overflow-hidden">
        <div className="flex items-start gap-5">
          <div className="p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)]">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-instrument-serif text-white uppercase tracking-wider">Präambel</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              THE FORGE ist eine B2B-SaaS-Plattform für Gründer und Teams. Die Plattform stellt Infrastruktur,
              KI-Funktionen, Automationen und Integrationen bereit. Wirtschaftliche Entscheidungen, Inhalte und Ergebnisse
              verbleiben in der Verantwortung der Nutzer.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-10">
        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 1 Anbieter, Geltungsbereich, Unternehmerstatus</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Diese AGB gelten für alle Verträge zwischen Özgür Azap, Stake & Scale (nachfolgend „Betreiber“) und den Nutzern (nachfolgend „Founder“) der Plattform THE FORGE.</p>
            <p>(2) Das Angebot richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB. Verbraucher im Sinne von § 13 BGB sind ausgeschlossen.</p>
            <p>(3) Der Founder sichert zu, bei Vertragsabschluss als Unternehmer zu handeln. Der Betreiber darf geeignete Nachweise anfordern.</p>
            <p>(4) Entgegenstehende oder ergänzende Bedingungen des Founders werden nur Vertragsbestandteil, wenn der Betreiber ihrer Geltung ausdrücklich in Textform zustimmt.</p>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Tools & Provider (Auszug)</h4>
            <div className="grid md:grid-cols-2 gap-6 text-xs text-white/60">
              <div className="space-y-2">
                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">KI</div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[var(--accent)] mt-0.5" />Gemini, Groq, Replicate (z.B. Veo, Kling, Flux), OpenAI</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[var(--accent)] mt-0.5" />Audio/Voice: ElevenLabs</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Integrationen & Infrastruktur</div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[var(--accent)] mt-0.5" />Notion, Slack, DocuSign (sofern aktiviert)</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[var(--accent)] mt-0.5" />Vercel, Vercel Blob, Stripe, Resend, Cloudflare</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 2 Vertragsabschluss und Account</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Der Vertrag über kostenpflichtige Leistungen kommt zustande, wenn der Founder im Checkout einen kostenpflichtigen Tarif oder ein Credit-Produkt auswählt und der Zahlungsvorgang erfolgreich abgeschlossen wird.</p>
            <p>(2) Der Founder ist verpflichtet, bei Registrierung und Nutzung vollständige und zutreffende Angaben zu machen und diese aktuell zu halten.</p>
            <p>(3) Zugangsdaten sind vertraulich zu behandeln und vor dem Zugriff Dritter zu schützen.</p>
            <p>(4) Der Betreiber kann Accounts bei begründetem Verdacht auf Missbrauch, Sicherheitsrisiken oder AGB-Verstöße vorläufig sperren.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 3 Leistungen und Verfügbarkeit</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Der Betreiber stellt eine Software-as-a-Service-Plattform mit Workspace-, Automations-, KI- und Integrationsfunktionen bereit.</p>
            <p>(2) Der Betreiber schuldet die Bereitstellung der Plattform im Rahmen der technischen und betrieblichen Möglichkeiten, nicht jedoch einen bestimmten wirtschaftlichen Erfolg oder ein bestimmtes KI-Ergebnis.</p>
            <p>(3) Funktionen, Modelle, Integrationen und Limits können aus sachlichen Gründen angepasst, erweitert, eingeschränkt oder ersetzt werden (z.B. Sicherheitsanforderungen, Anbieterwechsel, technische Weiterentwicklung).</p>
            <p>(4) Es besteht kein Anspruch auf ununterbrochene Verfügbarkeit. Wartungen, Updates, Sicherheitsmaßnahmen und Störungen externer Dienste können zu temporären Einschränkungen führen.</p>
            <p>(5) Der Betreiber ist nicht Teil interner Squad-Absprachen und verwaltet keine internen Squad-Gelder treuhänderisch.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 4 Preise, Abrechnung und Zahlungsbedingungen</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Es gelten die im Checkout und auf der Pricing-Seite zum Buchungszeitpunkt angezeigten Preise.</p>
            <p>(2) Platform Access ist ein wiederkehrendes Abonnement. Credits sind Einmalkäufe, sofern nicht ausdrücklich anders gekennzeichnet.</p>
            <p>(3) Die Zahlungsabwicklung erfolgt über Stripe. Rechnungen werden digital bereitgestellt.</p>
            <p>(4) Bei Zahlungsverzug ist der Betreiber berechtigt, Leistungen bis zur vollständigen Klärung auszusetzen oder den Zugang vorübergehend zu sperren.</p>
            <p>(5) Preisänderungen für wiederkehrende Leistungen gelten nur für zukünftige Abrechnungszeiträume und werden vorab in Textform mitgeteilt.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 5 Energy-Credits</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) „Energy“-Credits sind nutzungsbezogene Verbrauchseinheiten zur Abrechnung von KI-Funktionen und keine gesetzliche Währung, kein E-Geld und kein auszahlbares Guthaben.</p>
            <p>(2) Credits sind kontobezogen, nicht übertragbar und nicht an Dritte veräußerbar.</p>
            <p>(3) Credits aus regulären Credit-Packs verfallen nicht, solange ein Nutzerkonto besteht und nicht wirksam gesperrt oder beendet wurde; gesetzliche Vorgaben bleiben unberührt.</p>
            <p>(4) Bei fehlgeschlagenen oder technisch nicht abgeschlossenen KI-Jobs können reservierte Credits gemäß Systemlogik ganz oder teilweise rückgebucht werden.</p>
            <p>(5) Der Credit-Verbrauch pro Funktion kann sich ändern, insbesondere wenn externe Anbieter ihre Preise oder Modelle anpassen.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 6 Laufzeit, Kündigung, Sperrung, Widerruf</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Wiederkehrende Abonnements laufen bis zur Kündigung und verlängern sich um den jeweils gebuchten Abrechnungszeitraum.</p>
            <p>(2) Die Kündigung kann über die vorgesehenen Billing-Funktionen erfolgen und wird zum Ende des laufenden Abrechnungszeitraums wirksam.</p>
            <p>(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt für beide Parteien unberührt.</p>
            <p>(4) Bei schwerwiegenden AGB-Verstößen, Rechtsverletzungen oder Sicherheitsvorfällen kann der Betreiber Accounts und Funktionen sofort sperren.</p>
            <p>(5) Ein gesetzliches Widerrufsrecht nach § 312g BGB besteht nur für Verbraucher. Da das Angebot ausschließlich an Unternehmer gerichtet ist, besteht kein gesetzliches Widerrufsrecht für Founder als Unternehmer.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 7 Zulässige Nutzung, KI-Inhalte und Compliance</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Der Founder darf die Plattform nur im Rahmen geltenden Rechts nutzen und keine rechtswidrigen, täuschenden oder missbräuchlichen Inhalte erstellen oder verbreiten.</p>
            <p>(2) Beim Einsatz von Voice-Cloning, Lip-Sync, Face-Swap oder ähnlichen Funktionen muss der Founder über alle erforderlichen Einwilligungen und Nutzungsrechte verfügen.</p>
            <p>(3) KI-generierte oder KI-manipulierte Inhalte sind vom Founder zu kennzeichnen, soweit dies gesetzlich erforderlich ist. Für Transparenzpflichten nach Art. 50 EU AI Act gilt insbesondere der jeweilige gesetzliche Anwendungszeitpunkt (u.a. 2. August 2026).</p>
            <p>(4) Der Betreiber erbringt keine Rechts-, Steuer-, Anlage- oder Unternehmensberatung. KI-Ausgaben dienen ausschließlich als unverbindliche Struktur- und Informationshilfe.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 8 Inhalte, Rechte Dritter und Nutzungsrechte</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Der Founder bleibt Inhaber der Rechte an eigenen Eingaben und Outputs, soweit solche Rechte bestehen und gesetzlich zuweisbar sind.</p>
            <p>(2) Der Founder räumt dem Betreiber die nicht-exklusiven, zeitlich auf die Vertragslaufzeit begrenzten, technisch erforderlichen Rechte ein, um Inhalte zu hosten, zu verarbeiten, zu speichern und innerhalb der Plattform bereitzustellen.</p>
            <p>(3) Der Betreiber ist berechtigt, Inhalte bei konkreten Hinweisen auf Rechtsverletzungen vorläufig zu sperren oder zu entfernen.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 9 Drittanbieter, Integrationen und externe Dienste</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Die Plattform nutzt externe Dienste und APIs (z.B. Zahlungs-, Hosting-, E-Mail-, Speicher- und KI-Provider).</p>
            <p>(2) Verfügbarkeit, Antwortzeiten und Funktionsumfang dieser Drittanbieter liegen außerhalb des unmittelbaren Einflussbereichs des Betreibers.</p>
            <p>(3) Für Drittanbieterleistungen können ergänzend deren Bedingungen und Datenschutzinformationen gelten.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-2xl font-instrument-serif text-white">§ 10 Haftung</h3>
          </div>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Der Betreiber haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit sowie bei Schäden aus der Verletzung von Leben, Körper oder Gesundheit.</p>
            <p>(2) Bei leichter Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und der Höhe nach auf den vertragstypisch vorhersehbaren Schaden.</p>
            <p>(3) Die Haftung nach Produkthaftungsgesetz und aus zwingenden gesetzlichen Vorschriften bleibt unberührt.</p>
            <p>(4) Soweit gesetzlich zulässig, ist die Haftung bei leichter Fahrlässigkeit insgesamt auf die im Zeitpunkt des Schadensereignisses in den letzten zwölf Monaten gezahlten Entgelte des betroffenen Founders begrenzt.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 11 Freistellung</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Der Founder stellt den Betreiber von Ansprüchen Dritter frei, die auf einer rechtswidrigen Nutzung der Plattform oder einer Verletzung von Rechten Dritter durch den Founder beruhen.</p>
            <p>(2) Die Freistellung umfasst auch angemessene Kosten der Rechtsverteidigung.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-white/50" />
            <h3 className="text-2xl font-instrument-serif text-white">§ 12 Änderungen dieser AGB</h3>
          </div>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Der Betreiber kann diese AGB mit Wirkung für die Zukunft ändern, wenn hierfür ein sachlicher Grund besteht (z.B. Rechtsänderungen, Sicherheitsanforderungen, technische Weiterentwicklungen).</p>
            <p>(2) Änderungen werden mindestens 14 Tage vor Inkrafttreten in Textform mitgeteilt.</p>
            <p>(3) Widerspricht der Founder der Änderung fristgerecht, gelten die bisherigen AGB fort; beide Parteien können den Vertrag in diesem Fall ordentlich oder außerordentlich im Rahmen der gesetzlichen und vertraglichen Möglichkeiten beenden.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-2xl font-instrument-serif text-white">§ 13 Schutzrechte und unzulässige Nachahmung</h3>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Inhalte, Struktur, Datenbankbestand, Design-Elemente, Texte, Grafiken, Markenkennzeichen und Softwarebestandteile der Plattform sind rechtlich geschützt.</p>
            <p>(2) Unzulässig sind insbesondere die systematische Übernahme, Vervielfältigung oder öffentlich zugängliche Nachbildung wesentlicher Teile des Angebots ohne vorherige schriftliche Zustimmung des Betreibers.</p>
            <p>(3) Der Betreiber behält sich bei Rechtsverletzungen ausdrücklich zivil- und strafrechtliche Schritte vor, insbesondere Unterlassung, Auskunft, Schadensersatz und einstweiligen Rechtsschutz.</p>
          </div>
        </section>

        <section className="p-10 glass-card rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-white/50" />
            <h3 className="text-2xl font-instrument-serif text-white">§ 14 Schlussbestimmungen</h3>
          </div>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</p>
            <p>(2) Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des Betreibers (Dortmund).</p>
            <p>(3) Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
          </div>
        </section>
      </div>

      <div className="pt-12 text-center border-t border-white/5">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Stand: Februar 2026 • Version 2.0</p>
      </div>
    </div>
  );
}
