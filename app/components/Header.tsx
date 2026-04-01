'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import BetaLoginButton from '@/app/components/ui/BetaLoginButton';

export default function Header() {
  const { status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-center text-[var(--accent)] font-black shadow-lg group-hover:border-[var(--accent)] group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all duration-300">
            F
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">THE FORGE</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          {status === 'authenticated' ? (
            <Link
              href="/forum"
              className="text-sm font-bold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors tracking-wide uppercase"
            >
              Zum Forum
            </Link>
          ) : (
            <div className="flex items-center gap-6">
              <BetaLoginButton
                label="Login"
                showIcon={false}
                className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] transition-colors"
              />
              <a
                href="#apply"
                className="ember-glow bg-[var(--accent)] text-[var(--accent-foreground)] px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-md"
              >
                Apply Now
              </a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
