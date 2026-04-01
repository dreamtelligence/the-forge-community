import Link from 'next/link';
import { Scale, Shield, FileText, Gavel, Info } from 'lucide-react';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex flex-col group">
            <span className="font-caveat text-2xl tracking-normal text-white group-hover:text-[var(--accent)] transition-colors lowercase">stake & scale</span>
          </Link>
          <nav className="flex gap-8">
            <Link href="/" className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">
              Home
            </Link>
            <Link href="/forum" className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">
              Forum
            </Link>
          </nav>
        </div>
      </header>

      {/* Legal Navigation */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-bold text-white/20 mb-6 uppercase tracking-[0.3em]">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="opacity-30">/</span>
            <span className="text-white/40">Rechtliches</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                <Scale className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-instrument-serif text-white tracking-tight">Rechtsprotokolle</h1>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">Sicherheit und Transparenz im System.</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3">
            {[
              { label: 'Impressum', href: '/legal/impressum', icon: Info },
              { label: 'Datenschutz', href: '/legal/datenschutz', icon: Shield },
              { label: 'AGB', href: '/legal/agb', icon: Gavel },
              { label: 'Founder-Vertrag', href: '/legal/vertrag', icon: FileText },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white bg-white/5 border border-white/10 hover:border-[var(--accent)]/30 rounded-xl transition-all duration-500"
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-20 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--accent)]/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32" />
        <div className="relative z-10 prose prose-invert prose-sm max-w-none prose-headings:font-instrument-serif prose-headings:font-normal prose-headings:tracking-tight prose-p:text-white/60 prose-strong:text-white">
          {children}
        </div>
      </main>

      {/* Footer Note */}
      <div className="border-t border-white/5 bg-black/20 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mb-4">
            Fragen zu den Protokollen?
          </p>
          <a href="mailto:info@stakeandscale.de" className="text-xl font-instrument-serif text-[var(--accent)] hover:underline">
            info@stakeandscale.de
          </a>
        </div>
      </div>
    </div>
  );
}
