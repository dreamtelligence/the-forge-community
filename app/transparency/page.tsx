'use client';

import { useState, useEffect } from 'react';
import PageShell from '@/app/components/PageShell';
import AuthGuard from '@/app/components/AuthGuard';
import { BorderBeam } from '@/shared/ui/border-beam';
import { Hero195 } from '@/shared/ui/hero-195';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  CheckCircle,
  Clock,
  Shield,
  PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'Income' | 'Expense';
  date: string;
  status: string;
}

export default function TransparencyPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [foundersCount, setFoundersCount] = useState(0);
  const MAX_GROUP_SIZE = 25;

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        const response = await fetch('/api/transactions');
        if (!response.ok) throw new Error('Failed to fetch transactions');
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  useEffect(() => {
    async function fetchFoundersCount() {
      try {
        const response = await fetch('/api/founders');
        if (!response.ok) return;
        const data = await response.json();
        const founders = Array.isArray(data) ? data : data.founders || [];
        const activeCount = typeof data.count === 'number'
          ? data.count
          : founders.filter((f: { status?: string }) => f.status === 'active').length;
        setFoundersCount(activeCount);
      } catch (error) {
        console.error('Error fetching founders count:', error);
      }
    }
    fetchFoundersCount();
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(
    transactions
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const available = totalIncome - totalExpenses;
  const targetTiers = [25000, 50000, 100000];
  const targetCapital =
    targetTiers.find((tier) => totalIncome <= tier) ?? targetTiers[targetTiers.length - 1];
  const progressPercentage = Math.min((totalIncome / targetCapital) * 100, 100);

  const expensesByCategory = transactions
    .filter(t => t.type === 'Expense')
    .reduce((acc, t) => {
      const category = t.category;
      if (!acc[category]) acc[category] = 0;
      acc[category] += Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const milestones = [
    {
      title: 'Founder Recruiting',
      status: foundersCount >= MAX_GROUP_SIZE ? 'completed' : 'in_progress',
      date: 'Jan 2026',
      description: `${foundersCount} von max. ${MAX_GROUP_SIZE} Foundern`,
    },
    {
      title: 'Legal & Treuhandkonto',
      status: 'pending',
      date: 'Feb 2026',
      description: 'Verträge, Datenschutz, Konten',
    },
    {
      title: 'WMS & Warehouse MVP',
      status: 'pending',
      date: 'Feb-Mär 2026',
      description: 'Zonen, Regale, Scanner, WMS MVP',
    },
    {
      title: 'Pilotkunden',
      status: 'pending',
      date: 'Mär-Apr 2026',
      description: '1-3 Kunden, SLA/Cutoff, Billing',
    },
    {
      title: 'Skalierung',
      status: 'pending',
      date: 'Apr-Jun 2026',
      description: '7-10 Kunden, Retouren-Modul',
    },
  ];

  const handleExport = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const COLORS: Record<string, string> = {
    Supplier: '#FF9900',
    Marketing: '#FF5500',
    Legal: '#8B5CF6',
    Operations: '#06B6D4',
    Investment: '#10B981',
    Other: '#4B5563',
  };

  return (
    <AuthGuard>
      <PageShell>
        <header className="mb-16 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.3em] mb-6">
            <Shield className="w-3 h-3" />
            Radikale Transparenz
          </div>
          <h1 className="text-5xl md:text-6xl font-instrument-serif text-white tracking-tight mb-4">Finanz-Protokoll</h1>
          <p className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">Jeder Euro wird öffentlich dokumentiert. Keine versteckten Kosten.</p>
        </header>

        <Hero195 className="relative overflow-hidden border border-white/10 bg-[#0F1113] mb-16">
          <BorderBeam size={260} duration={12} anchor={80} colorFrom="#FF9900" colorTo="#FF6B35" />
          <div className="relative p-8 md:p-10">
            <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">Finanzen Live</div>
            <h2 className="text-3xl md:text-4xl font-instrument-serif text-white mb-3">Treasury Snapshot</h2>
            <p className="text-sm text-white/50 max-w-2xl">
              Echtzeit-Überblick über Kapitalfluss, Verfügbarkeit und Ausgaben. Jeder Move ist
              nachvollziehbar und exportierbar.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70">
                Einnahmen €{totalIncome.toLocaleString()}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70">
                Ausgaben €{totalExpenses.toLocaleString()}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70">
                Verfügbar €{available.toLocaleString()}
              </div>
              <button
                onClick={handleExport}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </Hero195>

        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <FinStatCard title="Einnahmen" value={totalIncome} icon={ArrowUpRight} color="text-green-500" />
          <FinStatCard title="Ausgaben" value={totalExpenses} icon={ArrowDownRight} color="text-red-500" />
          <FinStatCard title="Verfügbar" value={available} icon={DollarSign} color="text-blue-500" />
          <FinStatCard title="Ziel-Progress" value={`${progressPercentage.toFixed(1)}%`} icon={TrendingUp} color="text-[var(--accent)]" />
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-10 mb-16 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/[0.02] to-transparent pointer-events-none" />
          <div className="flex justify-between items-end mb-10">
            <div>
              <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Kapital-Status</div>
              <h2 className="text-3xl font-instrument-serif text-white">Kapital Progress</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-instrument-serif text-white">€{totalIncome.toLocaleString()}</div>
              <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-1">VON €{targetCapital.toLocaleString()}</div>
            </div>
          </div>
          <div className="bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]"
            />
          </div>
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-6">
            Noch {Math.max(0, MAX_GROUP_SIZE - foundersCount)} Plätze bis zum Cap • Beitrag = Zielkapital / Mitglieder
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div className="glass-card rounded-3xl border border-white/10 p-10 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-10">
               <PieChartIcon className="w-5 h-5 text-[var(--accent)]" />
               <h2 className="text-2xl font-instrument-serif text-white">Allokation</h2>
            </div>

            {pieData.length > 0 ? (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.Other} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F1113', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(value: any) => `€${Number(value || 0).toLocaleString()}`}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4">
                  {Object.entries(expensesByCategory).map(([category, amount]) => (
                    <div key={category} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[category] || COLORS.Other }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">{category}</div>
                        <div className="text-sm font-bold text-white truncate">€{amount.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Warte auf Datensätze...</p>
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl border border-white/10 p-10 relative overflow-hidden">
            <h2 className="text-2xl font-instrument-serif text-white mb-10">Meilensteine</h2>
            <div className="space-y-10">
              {milestones.map((milestone, i) => (
                <div key={i} className="flex items-start gap-6 group">
                  <div className="flex-shrink-0 mt-1 relative">
                    {milestone.status === 'in_progress' ? (
                      <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                    ) : milestone.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-white/10 group-hover:border-white/30 transition-colors" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-instrument-serif text-white group-hover:text-[var(--accent)] transition-colors">{milestone.title}</h3>
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-1 rounded-md">{milestone.date}</span>
                    </div>
                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider leading-relaxed">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <h2 className="text-2xl font-instrument-serif text-white">Transaktions-Log</h2>
            <button
              onClick={handleExport}
              className="flex items-center gap-3 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest border border-white/10 px-6 py-2.5 rounded-xl hover:bg-white/5 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              PROTOKOL EXPORTIEREN
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left bg-white/[0.01]">
                  <th className="py-6 px-8 text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Datum</th>
                  <th className="py-6 px-8 text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Beschreibung</th>
                  <th className="py-6 px-8 text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Kategorie</th>
                  <th className="py-6 px-8 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] text-right">Betrag</th>
                  <th className="py-6 px-8 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center text-white/10 text-[10px] font-bold uppercase tracking-widest animate-pulse">Lade Transaktionen...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-white/10 text-[10px] font-bold uppercase tracking-widest">Keine Datensätze gefunden.</td></tr>
                ) : transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="py-6 px-8 text-xs font-medium text-white/30">
                      {new Date(transaction.date).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-6 px-8 text-sm font-bold text-white group-hover:text-[var(--accent)] transition-colors">{transaction.description}</td>
                    <td className="py-6 px-8">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/5 text-white/40">
                        {transaction.category}
                      </span>
                    </td>
                    <td className={`py-6 px-8 text-sm text-right font-black ${transaction.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                      {transaction.amount > 0 ? '+' : ''}€{Math.abs(transaction.amount).toLocaleString()}
                    </td>
                    <td className="py-6 px-8 text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${transaction.status === 'Completed' ? 'border-green-500/20 bg-green-500/10 text-green-500' : 'border-amber-500/20 bg-amber-500/10 text-amber-500'}`}>
                        {transaction.status === 'Completed' ? 'ABGESCHLOSSEN' : 'OFFEN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageShell>
    </AuthGuard>
  );
}

function FinStatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="glass-card p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-700 relative overflow-hidden group">
      <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">{title}</div>
        <div className="text-3xl font-instrument-serif text-white tracking-tight group-hover:scale-105 transition-transform duration-700 origin-left">
          {typeof value === 'number' ? `€${value.toLocaleString()}` : value}
        </div>
      </div>
    </div>
  );
}
