'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FORGE_MENU } from '@/components/forge/forge-menu';

interface ForgeSidebarProps {
  ventureId: string;
  ventureName: string;
}

export default function ForgeSidebar({ ventureId }: ForgeSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[280px] flex-col border-r border-white/5 bg-[var(--background)] md:flex">
      {/* Navigation - Startet direkt oben */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pt-6">
        {FORGE_MENU.map((section) => (
          <div key={section.section}>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 px-3">
              {section.section}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const href = item.href.replace('[id]', ventureId);
                const isActive = pathname === href;
                const Icon = item.icon;

                return (
                  <Link
                    key={href}
                    href={href}
                    data-tour={item.tourId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#FF9900]/10 text-[#FF9900]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

      </nav>

      {/* Back to Main */}
      <div className="p-4 border-t border-white/5">
        <Link
          href="/forum"
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
        >
          ← Back to Forum
        </Link>
      </div>
    </aside>
  );
}
