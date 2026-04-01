import { FileText, Download, Check, Info, ShieldCheck } from 'lucide-react';

export default function VertragPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-6">
        <h2 className="text-4xl md:text-5xl text-white mb-4">Founder-Vertrag</h2>
        <p className="text-lg text-white/50 leading-relaxed">
          Das offizielle Protokoll deiner Beteiligung am Forge-System. Rechtlich bindend und absolut transparent.
        </p>
      </section>

      {/* Download CTA */}
      <div className="glass-card border border-[var(--accent)]/20 bg-[var(--accent)]/[0.02] rounded-3xl p-10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          <div className="flex items-start gap-5">
            <div className="p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
              <FileText className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-xl font-instrument-serif text-white mb-2 uppercase tracking-wider">Vertrags-Vorschau</h3>
              <p className="text-sm text-white/50 leading-relaxed max-w-md">
                Prüfe das Dokument in Ruhe. Transparenz ist die Basis unseres gemeinsamen Erfolgs.
              </p>
            </div>
          </div>
          <a
            href="#vertrag-vorschau"
            className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[var(--accent)] transition-all duration-500 shadow-2xl active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            PROTOKOLL ÖFFNEN
          </a>
        </div>
      </div>

      {/* Highlights */}
      <section className="space-y-10">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] text-center">Zentrale Bestimmungen</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Rechte', desc: 'Anteil = 1/N, Stimmrecht, volle Gewinnbeteiligung.' },
            { title: 'Pflichten', desc: 'Kapitalbeitrag, aktive Teilnahme an Votings.' },
            { title: 'Ertrag', desc: '100% der Netto-Gewinne an Squad/Founder. Verwendung frei (Reinvest/Entnahme).' },
            { title: 'Exit-Option', desc: 'Verkauf nach 6 Monaten, Vorkaufsrecht für Squad.' },
            { title: 'Haftung', desc: 'Beschränkt auf den geleisteten Beitrag.' },
            { title: 'Transparenz', desc: 'Vollständige Einsicht in alle Systemdaten.' },
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Check className="w-4 h-4 text-[var(--accent)]" />
                <h4 className="text-white font-bold text-sm uppercase tracking-wide">{item.title}</h4>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contract Content */}
      <div id="vertrag-vorschau" className="p-10 lg:p-16 glass-card rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
        
        <div className="max-h-[800px] overflow-y-auto scrollbar-hide space-y-12 pr-4 relative z-10">
          <div className="text-center space-y-4 mb-16">
            <h3 className="text-3xl lg:text-4xl font-instrument-serif text-white tracking-tight">FOUNDER-BETEILIGUNGSVERTRAG</h3>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/30 uppercase tracking-widest">
              THE FORGE COMMUNITY • SYSTEM-VERSION 1.0.4
            </div>
          </div>

          <div className="space-y-12 text-sm leading-relaxed text-white/60">
            <section className="space-y-4">
              <h4 className="text-white font-bold uppercase tracking-widest text-xs">Präambel</h4>
              <p>
                THE FORGE ist ein Community-basiertes Venture Studio, das es Individuen ermöglicht, 
                gemeinsam Assets aufzubauen und anteilig am operativen Erfolg teilzuhaben. 
                Dieser Vertrag regelt die aktive Beteiligung als Founder.
              </p>
            </section>

            <section className="space-y-4">
              <h4 className="text-white font-bold uppercase tracking-widest text-xs">§1 Parteien</h4>
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                <p><strong>Betreiber:</strong> Özgür Azap (Einzelunternehmen), Dortmund, Deutschland.</p>
                <p className="text-[var(--accent)] font-mono text-xs italic opacity-50">vs.</p>
                <p><strong>Founder:</strong> [Im Dossier hinterlegte Identität]</p>
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-white font-bold uppercase tracking-widest text-xs">§2 Gegenstand</h4>
              <p>2.1 Der Founder erwirbt eine gleichberechtigte Beteiligung am Squad-Projekt (1 / Mitgliederzahl).</p>
              <p>2.2 Der Beitrag ergibt sich aus dem Zielkapital der Gruppe. Bis zur GmbH-Gründung werden Einzahlungen durch die Squad eigenständig verwaltet. Der Betreiber übernimmt keine treuhänderische Verwaltung.</p>
            </section>

            <section className="space-y-4 pt-8 border-t border-white/5">
              <h4 className="text-white font-bold uppercase tracking-widest text-xs">§3 Ertrag & Split</h4>
              <p>100% der Netto-Gewinne stehen dem jeweiligen Squad/Founder zu. Ob und in welchem Umfang reinvestiert oder ausgeschüttet wird, entscheidet die Squad eigenständig.</p>
            </section>

            <div className="py-12 flex justify-center opacity-20">
              <div className="w-24 h-px bg-white/20" />
              <ShieldCheck className="w-6 h-6 mx-4" />
              <div className="w-24 h-px bg-white/20" />
            </div>

            <p className="text-center text-[10px] uppercase tracking-[0.2em]">Ende der Protokoll-Vorschau</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-8 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 flex gap-5 items-start">
        <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
        <p className="text-xs text-amber-500/70 leading-relaxed uppercase tracking-wide font-bold">
          Hinweis: Dies ist eine strukturelle Vorschau. Das finale Dokument wird für jede Squad individuell generiert und bei Bedarf notariell beglaubigt.
        </p>
      </div>
    </div>
  );
}
