import { Building2, Mail, ShieldCheck } from 'lucide-react';

export default function ImpressumPage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="space-y-6">
        <h2 className="text-4xl md:text-5xl text-white mb-4">Impressum</h2>
        <p className="text-lg text-white/50 leading-relaxed">
          Alle Informationen gemäß § 5 DDG. Radikale Transparenz ist unser Standard.
        </p>
      </section>

      {/* Transparency Note */}
      <div className="glass-card border border-[var(--accent)]/20 bg-[var(--accent)]/[0.02] rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex items-start gap-5 relative z-10">
          <div className="p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <ShieldCheck className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-xl font-instrument-serif text-white mb-2">Transparenz-Protokoll</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Dieses Impressum ist gesetzlich vorgeschrieben. Bei THE FORGE gehen wir jedoch weiter: 
              Jedes Mitglied einer Squad erhält vollständigen Einblick in alle operativen Finanzen und Verträge.
            </p>
          </div>
        </div>
      </div>

      {/* Main Legal Content */}
      <div className="grid gap-12">
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white/40" />
            </div>
            <h3 className="text-2xl font-instrument-serif text-white">Angaben gemäß § 5 DDG</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h4 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.3em] mb-4">Plattform-Betreiber</h4>
                <p className="text-4xl font-instrument-serif text-white leading-none mb-2">
                  STAKE & SCALE
                </p>
                <p className="text-white/40 text-xs uppercase tracking-widest font-bold">
                  Betrieben als Einzelunternehmen von Özgür Azap
                </p>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">Rechtliche Vertretung</h4>
                <p className="text-white/80 font-bold leading-relaxed">
                  Inhaber: Özgür Azap (Einzelunternehmen)<br />
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">Zentrale Postanschrift</h4>
                <p className="text-white/60 leading-relaxed">
                  Wittbräuckerstraße 109<br />
                  44287 Dortmund<br />
                  Deutschland
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">Direktkontakt</h4>
                <a href="mailto:info@stakeandscale.de" className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline font-bold">
                  <Mail className="w-4 h-4" />
                  info@stakeandscale.de
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-12 border-t border-white/5 space-y-6">
          <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Steuer-ID</h4>
          <p className="text-white/60 leading-relaxed">
            Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br />
            <span className="text-white font-mono text-lg mt-2 inline-block">DE456989341</span>
          </p>
        </section>

        <section className="pt-12 border-t border-white/5 space-y-6">
          <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Hinweis zu Schutzrechten</h4>
          <p className="text-white/60 leading-relaxed">
            Inhalte, Markenkennzeichen, Design-Elemente, Datenbankstrukturen und Softwarebestandteile von STAKE & SCALE
            sind rechtlich geschützt. Die unzulässige Übernahme oder Nachahmung wesentlicher Teile des Angebots ist
            untersagt. Rechtsverletzungen werden konsequent verfolgt.
          </p>
        </section>

        {/* Dispute Resolution */}
        <div className="grid md:grid-cols-2 gap-8 pt-12 border-t border-white/5">
          <section className="space-y-4">
            <h3 className="text-xl font-instrument-serif text-white">Verbraucherstreitbeilegung</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Hinweis gemäß § 36 VSBG: Wir sind nicht bereit oder verpflichtet, an
              Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-instrument-serif text-white">OS-Plattform (EU)</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Die frühere Plattform zur Online-Streitbeilegung (ODR) der EU wurde mit Wirkung
              zum 20. Juli 2025 eingestellt.
            </p>
          </section>
        </div>
      </div>

      {/* FAQ / Trust */}
      <section className="pt-20 border-t border-white/5">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-12 text-center">Status & Haftung</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              q: "Privatadresse?",
              a: "THE FORGE wird aktuell als Einzelunternehmen von Özgür Azap betrieben. Nach Squad-Gründung folgen offizielle Standorte."
            },
            {
              q: "Haftung?",
              a: "Aktuell vollumfänglich durch den Betreiber. Nach GmbH-Gründung haftet die Gesellschaft mit ihrem Stammkapital."
            },
            {
              q: "Gültigkeit?",
              a: "Diese Adresse ist für alle offiziellen Zustellungen gültig. Das System ist vollständig abgesichert."
            }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wide">{item.q}</h4>
              <p className="text-xs text-white/40 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
