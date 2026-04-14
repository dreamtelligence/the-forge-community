import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/security/admin';
import Link from 'next/link';
import { Shield, Users, LayoutDashboard, LogOut } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10 text-white">
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="font-instrument-serif text-xl">Nexus Core</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Admin System</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/admin/applicants" className="flex items-center gap-3 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <Users className="w-4 h-4" />
            Registrierungen
          </Link>
        </nav>

        <div className="pt-6 border-t border-white/10">
          <Link href="/forum" className="flex items-center gap-3 px-4 py-3 text-sm text-white/40 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Exit to App
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
