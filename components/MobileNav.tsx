'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Settings, Sliders, X, CreditCard } from 'lucide-react';
import { navigation } from './navigation';
import { SignOutButton } from './SignOutButton';
import { CreditsDisplay } from './CreditsDisplay';
import { useUnreadMessages } from '@/app/hooks/useUnreadMessages';

export default function MobileNav() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();
  const messageBadge = unreadCount > 99 ? '99+' : String(unreadCount);
  const [open, setOpen] = useState(false);

  const activeItem = useMemo(
    () => navigation.find((item) => pathname === item.href) || null,
    [pathname]
  );

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[140] flex items-center justify-between border-b border-white/10 bg-[#08090A]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
          aria-label="Navigation öffnen"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">
            Forge OS
          </div>
          <div className="text-sm font-semibold text-white">
            {activeItem?.name || 'Forum'}
          </div>
        </div>
        <div className="h-10 w-10" aria-hidden="true" />
      </div>

      <div
        id="mobile-navigation"
        className={`fixed inset-0 z-[150] lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <button
          onClick={() => setOpen(false)}
          className={`absolute inset-0 z-0 bg-black/70 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Navigation schließen"
        />
        <div
          className={`absolute left-0 top-0 h-full w-[86%] max-w-xs border-r border-white/10 bg-[#08090A] transition-transform duration-300 z-10 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">Navigation</div>
              <div className="text-sm font-semibold text-white">Forge Control</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60"
              aria-label="Navigation schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="px-4 py-5 space-y-1 overflow-y-auto h-[calc(100vh-240px)]">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const showBadge = item.name === 'Messages' && unreadCount > 0;
              const showStatus = item.status === 'WIP';
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 ${
                    isActive
                      ? 'bg-white/5 text-[var(--accent)] border border-white/10'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : ''}`} />
                  {item.name}
                  {showStatus && (
                    <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/40">
                      In Arbeit
                    </span>
                  )}
                  {showBadge && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#FF9900] text-[9px] font-bold text-black flex items-center justify-center">
                      {messageBadge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20 px-2 pt-6 pb-2">
              Account
            </div>
            <Link
              href="/settings/billing"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 ${
                pathname === '/settings/billing'
                  ? 'bg-white/5 text-[var(--accent)] border border-white/10'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Billing
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 ${
                pathname === '/settings'
                  ? 'bg-white/5 text-[var(--accent)] border border-white/10'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Account
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 ${
                pathname === '/profile'
                  ? 'bg-white/5 text-[var(--accent)] border border-white/10'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Settings className="w-4 h-4" />
              Founder Dossier
            </Link>
          </nav>

          <div className="border-t border-white/10 bg-black/20 pb-6 pt-4">
            <CreditsDisplay />
            <div className="px-6">
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
