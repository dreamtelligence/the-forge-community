'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Sliders, CreditCard, Shield, Euro, UserCog, Sparkles } from 'lucide-react';
import { SignOutButton } from './SignOutButton';
import { useUnreadMessages } from '@/app/hooks/useUnreadMessages';
import { navigation } from './navigation';
import { useSession } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const messageBadge = unreadCount > 99 ? '99+' : String(unreadCount);
  const [isTriggeringNews, setIsTriggeringNews] = useState(false);

  const triggerAiNews = async () => {
    if (isTriggeringNews) return;
    setIsTriggeringNews(true);
    try {
      const res = await fetch('/api/admin/ai-news/trigger', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Trigger failed');
      const message = data?.result?.skipped ? `AI News: ${data.result.reason}` : 'AI News gepostet.';
      window.alert(message);
    } catch (error: any) {
      window.alert(error?.message || 'AI News Trigger fehlgeschlagen.');
    } finally {
      setIsTriggeringNews(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-[var(--background)] border-r border-white/5 flex flex-col z-50">

      {/* Nav - Kompakt für keine Scrollbar */}
      <nav className="flex-1 px-4 py-3 space-y-0.5 relative z-10">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const showBadge = item.name === 'Messages' && unreadCount > 0;
          const showStatus = item.status === 'WIP';
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all group ${
                isActive 
                  ? 'bg-white/5 text-[var(--accent)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} />
              {item.name}
              {showStatus && (
                <span className="ml-auto text-[7px] text-white/30">
                  WIP
                </span>
              )}
              {showBadge && (
                <span className="ml-auto min-w-[16px] h-4 px-1 rounded-full bg-[#FF9900] text-[8px] font-bold text-black flex items-center justify-center">
                  {messageBadge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] px-3 mb-1 mt-4">
              Admin
            </div>
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 group ${
                pathname === '/admin'
                  ? 'bg-white/5 text-[var(--accent)] border border-white/10'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Shield className="w-4 h-4 transition-transform duration-500 group-hover:scale-110" />
              Dashboard
            </Link>
            <Link
              href="/admin/finance"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 group ${
                pathname === '/admin/finance'
                  ? 'bg-white/5 text-[var(--accent)] border border-white/10'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Euro className="w-4 h-4 transition-transform duration-500 group-hover:rotate-12" />
              Finance
            </Link>
            <Link
              href="/admin/users"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 group ${
                pathname === '/admin/users'
                  ? 'bg-white/5 text-[var(--accent)] border border-white/10'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <UserCog className="w-4 h-4 transition-transform duration-500 group-hover:scale-110" />
              Users
            </Link>
            <button
              type="button"
              onClick={triggerAiNews}
              disabled={isTriggeringNews}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 group ${
                isTriggeringNews
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Sparkles className={`w-4 h-4 transition-transform duration-500 ${isTriggeringNews ? '' : 'group-hover:scale-110'}`} />
              {isTriggeringNews ? 'AI News...' : 'AI News Now'}
            </button>
          </>
        )}

        <div className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] px-3 mb-1 mt-4">
          Account
        </div>
        <Link
          href="/settings/billing"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all group ${
            pathname === '/settings/billing'
              ? 'bg-white/5 text-[var(--accent)]'
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Billing
        </Link>
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all group ${
            pathname === '/settings'
              ? 'bg-white/5 text-[var(--accent)]'
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Account
        </Link>
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all group ${
            pathname === '/profile' 
              ? 'bg-white/5 text-[var(--accent)]' 
              : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Founder Dossier
        </Link>
      </nav>

      {/* Footer - Kompakt */}
      <div className="border-t border-white/5 relative z-10 pb-4 pt-3">
        <div className="px-4">
          <SignOutButton />
        </div>
      </div>
  </aside>
  );
}
