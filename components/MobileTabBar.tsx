'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, Image as ImageIcon, MessageCircle, MessageSquare } from 'lucide-react';
import { useUnreadMessages } from '@/app/hooks/useUnreadMessages';

const tabs = [
  { href: '/forum', label: 'Forum', shortLabel: 'Forum', icon: MessageSquare },
  { href: '/messages', label: 'Messages', shortLabel: 'Chat', icon: MessageCircle },
  { href: '/media', label: 'Media', shortLabel: 'Media', icon: ImageIcon },
  { href: '/tasks', label: 'Tasks', shortLabel: 'Tasks', icon: CheckSquare },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();
  const messageBadge = unreadCount > 99 ? '99+' : String(unreadCount);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[140] lg:hidden">
      <nav className="border-t border-white/10 bg-[#08090A]/95 backdrop-blur-xl px-2 sm:px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            const showBadge = tab.href === '/messages' && unreadCount > 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                data-tour={`tab-${tab.href.replace('/', '')}`}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-1.5 xs:px-2 sm:px-3 py-2 text-[8px] xs:text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.05em] xs:tracking-[0.1em] sm:tracking-[0.15em] transition ${
                  active
                    ? 'text-[var(--accent)] bg-white/5'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.shortLabel}</span>
                {showBadge && (
                  <span className="absolute -right-0.5 top-0.5 sm:right-1 sm:top-1 h-4 min-w-[16px] rounded-full bg-[#FF9900] px-1 text-[9px] font-bold text-black flex items-center justify-center">
                    {messageBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
