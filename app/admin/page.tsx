'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UserPlus, CheckCircle2, XCircle, ArrowRight, Activity, Clock, Euro } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    recent: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [topupEmail, setTopupEmail] = useState('');
  const [topupAmount, setTopupAmount] = useState(50);
  const [topupStatus, setTopupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const amountIsValid = Number.isFinite(topupAmount) && topupAmount > 0;

  useEffect(() => {
    fetch('/api/admin/applicants')
      .then(res => res.json())
      .then(data => {
        setStats({
          total: data.length,
          pending: data.filter((a: any) => a.status === 'PENDING').length,
          approved: data.filter((a: any) => a.status === 'APPROVED').length,
          rejected: data.filter((a: any) => a.status === 'REJECTED').length,
          recent: data.slice(0, 5)
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load stats', err);
        setLoading(false);
      });
  }, []);

  const handleTopup = async () => {
    setTopupLoading(true);
    setTopupStatus(null);

    try {
      const res = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: topupEmail.trim() || undefined,
          amount: topupAmount,
          reason: 'admin-topup'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTopupStatus({ type: 'error', message: data?.error || 'Top-up fehlgeschlagen.' });
        return;
      }

      setTopupStatus({
        type: 'success',
        message: `${data.email} hat jetzt ${data.creditsRemaining} Credits.`
      });
      setTopupEmail('');
    } catch (error) {
      console.error('Top-up failed', error);
      setTopupStatus({ type: 'error', message: 'Serverfehler beim Top-up.' });
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/20 text-xs font-bold uppercase tracking-widest animate-pulse">
        Lade Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-instrument-serif text-white mb-2">Command Center</h1>
          <p className="text-white/40 text-sm">Willkommen zurück, Operator.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-1">System Status</div>
          <div className="flex items-center gap-2 text-green-400 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            OPERATIONAL
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Applications" 
          value={stats.total} 
          icon={Users} 
          color="blue"
        />
        <StatCard 
          title="Pending Review" 
          value={stats.pending} 
          icon={Clock} 
          color="yellow"
          highlight={stats.pending > 0}
        />
        <StatCard 
          title="Founders Active" 
          value={stats.approved} 
          icon={CheckCircle2} 
          color="green"
        />
        <StatCard 
          title="Rejected" 
          value={stats.rejected} 
          icon={XCircle} 
          color="red"
        />
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/admin/finance" className="group">
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all h-full flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition">
                <Euro className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-instrument-serif text-white">Finance</h3>
                <p className="text-xs text-white/40">Rechnungen & EÜR</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-green-400 group-hover:translate-x-1 transition-transform">
              Explorer öffnen <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link href="/admin/users" className="group">
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all h-full flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-instrument-serif text-white">User Management</h3>
                <p className="text-xs text-white/40">Accounts verwalten</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-blue-400 group-hover:translate-x-1 transition-transform">
              Alle User anzeigen <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link href="/admin/applicants" className="group">
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-yellow-500/30 transition-all h-full flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition">
                <UserPlus className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-instrument-serif text-white">Bewerbungen</h3>
                <p className="text-xs text-white/40">Pending: {stats.pending}</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-yellow-400 group-hover:translate-x-1 transition-transform">
              Review starten <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions / Link to Applicants */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-instrument-serif text-white">Bewerbungen</h3>
            <Link 
              href="/admin/applicants" 
              className="text-xs text-[#FF9900] hover:underline flex items-center gap-1"
            >
              Alle anzeigen <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats.recent.length > 0 ? (
              stats.recent.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      app.status === 'APPROVED' ? 'bg-green-500' :
                      app.status === 'REJECTED' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="text-sm text-white font-medium">{app.name}</div>
                      <div className="text-xs text-white/40">{app.email}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-white/20 text-xs">Keine Daten vorhanden</div>
            )}
          </div>
          
          {stats.pending > 0 && (
            <div className="pt-4 border-t border-white/5">
              <Link href="/admin/applicants" className="w-full group flex items-center justify-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all">
                <span className="text-xs font-bold uppercase tracking-widest">
                  {stats.pending} {stats.pending === 1 ? 'Bewerbung' : 'Bewerbungen'} prüfen
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>

        {/* Energy Top-up */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <Activity className="w-6 h-6 text-white/30" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Energy Top-up</h3>
              <p className="text-xs text-white/40">Admin-only Credits für Tests & Ops.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">
                Ziel-Email (optional)
              </label>
              <input
                value={topupEmail}
                onChange={(event) => setTopupEmail(event.target.value)}
                placeholder="info@stakeandscale.de"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-[#FF9900] outline-none"
              />
              <p className="mt-1 text-[10px] text-white/30">Leer lassen = dein Account.</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">
                Credits
              </label>
              <input
                type="number"
                min={1}
                value={topupAmount}
                onChange={(event) => setTopupAmount(Number(event.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-[#FF9900] outline-none"
              />
            </div>
            <button
              onClick={handleTopup}
              disabled={topupLoading || !amountIsValid}
              className="w-full rounded-xl bg-[#FF9900] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
            >
              {topupLoading ? 'Lade Credits...' : 'Credits gutschreiben'}
            </button>
          </div>

          {topupStatus && (
            <div
              className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-widest ${
                topupStatus.type === 'success'
                  ? 'border-green-500/30 bg-green-500/10 text-green-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {topupStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, highlight = false }: any) {
  const colors: any = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };

  return (
    <div className={`glass-card p-6 rounded-2xl border ${highlight ? 'border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : 'border-white/10'} bg-white/[0.02] flex flex-col justify-between h-32 relative overflow-hidden group`}>
      <div className="flex justify-between items-start z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{title}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="z-10">
        <span className="text-3xl font-bold text-white font-sora">{value}</span>
      </div>
      
      {/* Hover Glow */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity ${
        color === 'blue' ? 'bg-blue-500' :
        color === 'green' ? 'bg-green-500' :
        color === 'red' ? 'bg-red-500' : 'bg-yellow-500'
      }`} />
    </div>
  );
}
