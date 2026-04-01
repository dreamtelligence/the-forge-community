'use client';

import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';

export default function ApplicantsPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/registrations?limit=10');
      if (res.ok) {
        const payload = await res.json();
        setRegistrations(payload.users || []);
        setTotal(payload.total || 0);
      }
    } catch (err) {
      console.error('Failed to load registrations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  if (loading) return <div className="text-white p-10">Lade Daten...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-instrument-serif text-white">Registrierungen</h2>
        <div className="text-sm text-white/40">Letzte 10 von {total}</div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-white/40">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">E-Mail</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((user) => (
              <tr key={user.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white/50 font-mono text-xs">
                  {new Date(user.createdAt).toLocaleString('de-DE')}
                </td>
                <td className="px-4 py-3 text-white font-semibold">{user.name || '—'}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-white/70 hover:text-white">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-white/60 text-xs uppercase tracking-widest">
                  {user.role}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    user.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {user.isBanned ? 'BANNED' : user.accountStatus}
                  </span>
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40 text-xs uppercase tracking-widest">
                  Keine Registrierungen gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
