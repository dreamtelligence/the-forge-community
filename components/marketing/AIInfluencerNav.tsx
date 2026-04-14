'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, User, Mic2, Dna } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = (ventureId: string) => [
  { id: 'prompt-designer', label: 'Prompt Designer', href: `/forge/${ventureId}/marketing/ai-influencer`, icon: Sparkles },
  { id: 'avatar', label: 'AI Avatar', href: `/forge/${ventureId}/marketing/faceswap`, icon: User },
  { id: 'lipsync', label: 'Lip-Sync', href: `/forge/${ventureId}/marketing/lipsync`, icon: Mic2 },
  { id: 'character-dna', label: 'Character DNA', href: `/forge/${ventureId}/marketing/character-dna`, icon: Dna },
];

interface AIInfluencerNavProps {
  ventureId: string;
}

export function AIInfluencerNav({ ventureId }: AIInfluencerNavProps) {
  const pathname = usePathname();
  const items = tabs(ventureId);

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap',
              isActive(item.href)
                ? 'bg-[#FF9900] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
