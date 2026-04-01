import { Shield, Database, Lock, Check, ExternalLink } from 'lucide-react';

export default function DatenschutzPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-6">
        <h2 className="text-4xl md:text-5xl text-white mb-4">Datenschutz-Protokoll</h2>
        <p className="text-lg text-white/50 leading-relaxed">
          Deine Daten sind dein Eigentum. Wir sind lediglich die Verwalter innerhalb des Systems.
        </p>
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
          Stand: Februar 2026 • Protokoll-Version 1.2
        </p>
      </section>

      {/* DSGVO Principles */}
      <div className="glass-card border border-emerald-500/20 bg-emerald-500/[0.02] rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex items-start gap-5 relative z-10">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-instrument-serif text-white mb-4">Kern-Prinzipien</h3>
            <ul className="space-y-3 text-sm text-white/60">
              {[
                "Minimale Datenerfassung: Nur was absolut notwendig ist.",
                "Kein Handel: Daten werden niemals verkauft oder getauscht.",
                "Volle Kontrolle: Jederzeitige Löschung auf Anfrage.",
                "Sicherheit: Alle Founder-Daten werden verschlüsselt gespeichert."
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-12">
        {/* Responsible Party */}
        <section className="p-10 glass-card rounded-3xl border border-white/10 relative overflow-hidden">
          <h3 className="text-2xl font-instrument-serif text-white mb-6">Verantwortlicher</h3>
          <p className="text-sm text-white/50 mb-6 uppercase tracking-wider">Verantwortlich für die Verarbeitung:</p>
          <div className="text-white/80 space-y-2 leading-relaxed">
            <p className="font-bold">Özgür Azap</p>
            <p>Wittbräuckerstraße 109</p>
            <p>44287 Dortmund, Deutschland</p>
            <p className="pt-4">
              <a href="mailto:info@stakeandscale.de" className="text-[var(--accent)] hover:underline flex items-center gap-2">
                info@stakeandscale.de
              </a>
            </p>
          </div>
        </section>

        {/* Data Collection */}
        <section className="space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-white/40" />
            </div>
            <h3 className="text-2xl font-instrument-serif text-white">Datenerfassung</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-2xl">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">Aktive Eingabe (Founder)</h4>
              <ul className="space-y-4 text-xs text-white/60">
                <li><strong className="text-white">Identität:</strong> Name und Kontakt zur Identifikation</li>
                <li><strong className="text-white">Kommando:</strong> E-Mail für System-Updates</li>
                <li><strong className="text-white">Verbindung:</strong> Telefon & Socials für Onboarding</li>
                <li><strong className="text-white">Strategie:</strong> Motivation & Skills für Squad-Matching</li>
              </ul>
            </div>
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-2xl">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">System-Protokolle (Automatisch)</h4>
              <ul className="space-y-4 text-xs text-white/60">
                <li><strong className="text-white">IP-Adresse:</strong> Operativ notwendig für Zugriffsschutz</li>
                <li><strong className="text-white">Client-Info:</strong> Browser & OS für korrekte Darstellung</li>
                <li><strong className="text-white">Zeitstempel:</strong> Zugriffsprotokollierung für Sicherheit</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Legal Basis & Purposes */}
        <section className="p-10 glass-card rounded-3xl border border-white/10 relative overflow-hidden">
          <h3 className="text-2xl font-instrument-serif text-white mb-8">Rechtsgrundlagen & Verarbeitungszwecke</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Zwecke</h4>
              <ul className="space-y-3 text-xs text-white/60">
                <li><strong className="text-white">Plattformbetrieb:</strong> Account, Auth, Teams/Squads, Datei‑ & Content‑Management.</li>
                <li><strong className="text-white">KI‑Funktionen:</strong> Generierung von Text/Bild/Video/Audio und Automationen.</li>
                <li><strong className="text-white">Abrechnung:</strong> Zahlungen, Rechnungen, Credits/Energy.</li>
                <li><strong className="text-white">Sicherheit:</strong> Abuse‑Prävention, Rate‑Limits, Logging.</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Rechtsgrundlagen (DSGVO)</h4>
              <ul className="space-y-3 text-xs text-white/60">
                <li><strong className="text-white">Art. 6 Abs. 1 lit. b:</strong> Vertragserfüllung (Betrieb der SaaS‑Plattform).</li>
                <li><strong className="text-white">Art. 6 Abs. 1 lit. c:</strong> Rechtliche Pflichten (z.B. Rechnungsaufbewahrung).</li>
                <li><strong className="text-white">Art. 6 Abs. 1 lit. f:</strong> Berechtigtes Interesse (Sicherheit, Missbrauchsschutz).</li>
                <li><strong className="text-white">Art. 6 Abs. 1 lit. a:</strong> Einwilligung (optional, z.B. Marketing).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Retention & Transfers */}
        <section className="p-10 glass-card rounded-3xl border border-white/10 relative overflow-hidden">
          <h3 className="text-2xl font-instrument-serif text-white mb-8">Speicherdauer & Drittlandtransfer</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Speicherdauer</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Daten werden nur solange gespeichert, wie sie für den jeweiligen Zweck erforderlich sind oder gesetzliche
                Aufbewahrungsfristen bestehen. Nach Zweckwegfall oder Löschanfrage werden Daten gelöscht oder anonymisiert.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Drittlandtransfer</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Bei einigen Dienstleistern kann eine Verarbeitung in Drittländern (z. B. USA) stattfinden. Soweit
                erforderlich, erfolgt dies auf Grundlage von EU‑Standardvertragsklauseln (SCC) oder gleichwertigen Schutzmaßnahmen.
              </p>
            </div>
          </div>
        </section>

        {/* External Services */}
        <section className="space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-white/40" />
            </div>
            <h3 className="text-2xl font-instrument-serif text-white">Externe Sub-Systeme & KI-Provider</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Infrastruktur & Hosting',
                items: [
                  { name: "Vercel", purpose: "Hosting, Serverless & Storage (Vercel Blob)", url: "https://vercel.com/privacy" },
                  { name: "Cloudflare", purpose: "Bot-Schutz (Turnstile) & DNS", url: "https://www.cloudflare.com/privacypolicy/" },
                  { name: "Neon", purpose: "Postgres Datenbank (EU-Server)", url: "https://neon.tech/privacy" }
                ]
              },
              {
                title: 'Payments & Abrechnung',
                items: [
                  { name: "Stripe", purpose: "Zahlungsabwicklung & Rechnungen", url: "https://stripe.com/privacy" }
                ]
              },
              {
                title: 'Kommunikation & Integrationen',
                items: [
                  { name: "Resend", purpose: "Magic-Links & System-Emails", url: "https://resend.com/privacy" },
                  { name: "Notion", purpose: "Archiv & Bewerber-Datenbank", url: "https://notion.so/privacy" },
                  { name: "Slack", purpose: "Team-Kommunikation & Integrationen (optional)", url: "https://slack.com/privacy-policy" },
                  { name: "DocuSign", purpose: "Vertrags-Workflows (optional)", url: "https://www.docusign.com/company/privacy-policy" }
                ]
              },
              {
                title: 'KI-Provider',
                items: [
                  { name: "Google (Gemini)", purpose: "Text/Bild/Video Generierung (optional)", url: "https://policies.google.com/privacy" },
                  { name: "OpenAI", purpose: "KI-Modelle & Assistenz (optional)", url: "https://openai.com/policies/privacy-policy" },
                  { name: "Replicate", purpose: "Modelle wie Veo, Kling, Luma, Minimax, Flux", url: "https://replicate.com/privacy" },
                  { name: "Groq", purpose: "KI-Inferenz/Fallback (optional)", url: "https://groq.com/privacy-policy" },
                  { name: "ElevenLabs", purpose: "Voice & Audio Generierung (optional)", url: "https://elevenlabs.io/privacy" }
                ]
              }
            ].map((group) => (
              <div key={group.title} className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">{group.title}</h4>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item.name} className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-white font-bold">{item.name}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-widest">{item.purpose}</div>
                      </div>
                      <a href={item.url} target="_blank" className="pt-1">
                        <ExternalLink className="w-4 h-4 text-white/10 hover:text-[var(--accent)] transition-colors" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Rights */}
        <section className="p-10 glass-card rounded-3xl border border-white/10 relative overflow-hidden">
          <h3 className="text-2xl font-instrument-serif text-white mb-10">Deine Rechte als Operator</h3>
          <div className="grid md:grid-cols-2 gap-10">
            {[
              { t: "Auskunft (Art. 15)", d: "Vollständige Einsicht in alle gespeicherten Datensätze." },
              { t: "Berichtigung (Art. 16)", d: "Sofortige Korrektur fehlerhafter Informationen." },
              { t: "Löschung (Art. 17)", d: "Entfernung aller Daten (sofern keine gesetzlichen Fristen bestehen)." },
              { t: "Portabilität (Art. 20)", d: "Download deiner Daten in strukturiertem Format." }
            ].map((right, i) => (
              <div key={i} className="flex gap-4">
                <div className="text-[var(--accent)] font-mono text-xs mt-1">→</div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-2">{right.t}</h4>
                  <p className="text-xs text-white/40 leading-relaxed">{right.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 rounded-2xl bg-[var(--accent)]/5 border border-[var(--accent)]/20">
            <p className="text-xs text-white/60 leading-relaxed">
              Anfrage an <a href="mailto:info@stakeandscale.de" className="text-[var(--accent)] font-bold">info@stakeandscale.de</a>. 
              Bearbeitungszeit: 48h.
            </p>
          </div>
        </section>
      </div>

      <div className="pt-12 text-center border-t border-white/5">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Stand: Februar 2026 • Protokoll-Version 1.2</p>
      </div>
    </div>
  );
}
