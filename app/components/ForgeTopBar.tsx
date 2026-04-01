'use client';

import { Venture, Squad, SquadMember } from '@prisma/client';
import { Rocket, Users } from 'lucide-react';

interface ForgeTopBarProps {
  venture: (Venture & { typeLabel?: string | null }) & {
    owner: { name: string | null; email: string };
    squad: (Squad & {
      members: (SquadMember & {
        user: { name: string | null; email: string; image: string | null };
      })[];
    }) | null;
  };
}

export default function ForgeTopBar({ venture }: ForgeTopBarProps) {
  const statusColors: Record<string, string> = {
    IDEATION: 'bg-blue-500/10 text-blue-400',
    IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400',
    LAUNCHED: 'bg-green-500/10 text-green-400',
    PAUSED: 'bg-gray-500/10 text-gray-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
  };

  const typeLabels: Record<string, string> = {
    ECOMMERCE: 'E-Commerce',
    SAAS: 'SaaS',
    SERVICE: 'Service',
    INFLUENCER: 'Influencer',
    MARKETPLACE: 'Marketplace',
    AGENCY: 'Agency',
    OTHER: 'Sonstiges'
  };
  const ventureTypeLabel = venture.typeLabel?.trim() || typeLabels[venture.type] || venture.type;

  return (
    <header className="h-16 border-b border-white/5 bg-black/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Left: Venture Info */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${statusColors[venture.status]}`}>
              {venture.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-white/40">
              {ventureTypeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Squad Members / Owner */}
      <div className="flex items-center gap-4">
        {venture.squad && venture.squad.members.length > 0 ? (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/40" />
            <div className="flex -space-x-2">
              {venture.squad.members.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center overflow-hidden"
                  title={member.user.name || member.user.email}
                >
                  {member.user.image ? (
                    <img src={member.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-white/60">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {venture.squad.members.length > 5 && (
              <span className="text-xs text-white/40">
                +{venture.squad.members.length - 5}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-white/40">
            Solo: {venture.owner.name || venture.owner.email}
          </div>
        )}

        {venture.status === 'LAUNCHED' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg">
            <Rocket className="w-4 h-4 text-green-400" />
            <span className="text-xs font-bold text-green-400">LIVE</span>
          </div>
        )}
      </div>
    </header>
  );
}
