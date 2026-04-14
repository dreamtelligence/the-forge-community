'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className={className || "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-500 group"}
    >
      <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform duration-500" />
      System verlassen
    </button>
  );
}