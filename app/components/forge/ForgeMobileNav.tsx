'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Zap } from 'lucide-react';
import { FORGE_MENU } from '@/app/components/forge/forge-menu';

interface ForgeMobileNavProps {
  ventureId: string;
  ventureName: string;
}

export default function ForgeMobileNav({ ventureId, ventureName }: ForgeMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-white/5 bg-black/80 px-3 sm:px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-2 px-2 text-center min-w-0">
          <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF9900] to-[#FF9900]">
            <Zap className="h-4 w-4 text-black" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Forge</div>
            <div className="max-w-[140px] truncate text-xs font-semibold text-white">{ventureName}</div>
          </div>
        </div>

        <Link
          href={pathname === `/forge/${ventureId}` ? "/forum" : `/forge/${ventureId}`}
          className="flex-shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          {pathname === `/forge/${ventureId}` ? 'Exit' : 'Back'}
        </Link>
      </div>

      <div
        className={`fixed inset-0 z-50 transition ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-[78vw] max-w-[320px] flex-col border-r border-white/10 bg-zinc-950 p-4 transition-transform ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF9900] to-[#FF9900]">
                <Zap className="h-4 w-4 text-black" />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">The Forge</div>
                <div className="text-sm font-semibold text-white">{ventureName}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-6 flex-1 min-h-0 space-y-5 overflow-y-auto pr-1">
            {FORGE_MENU.map((section) => (
              <div key={section.section}>
                <div className="px-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
                  {section.section}
                </div>
                <div className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const href = item.href.replace('[id]', ventureId);
                    const isActive = pathname === href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[#FF9900]/15 text-[#FF9900]'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

          </nav>

          <div className="mt-8 border-t border-white/10 pt-4">
            <Link
              href="/forum"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50 hover:text-white"
            >
              ← Back to Forum
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
