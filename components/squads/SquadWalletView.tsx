'use client';

import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  createdAt: string;
  createdBy: { name: string };
}

interface WalletData {
  balance: number;
  budgetTotal: number;
  budgetSamples: number;
  budgetProduction: number;
  budgetMarketing: number;
  transactions: Transaction[];
}

export function SquadWalletView({ wallet }: { wallet: WalletData }) {
  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[#FF9900]" />
            </div>
            <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Squad Guthaben</p>
          <h3 className="text-4xl font-instrument-serif text-white">€{wallet.balance.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-green-400 font-bold">
            <TrendingUp className="w-3 h-3" />
            +12% vs. Vormonat
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/10 col-span-2">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Budget Verteilung</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Samples', amount: wallet.budgetSamples, color: 'bg-blue-500' },
              { label: 'Produktion', amount: wallet.budgetProduction, color: 'bg-purple-500' },
              { label: 'Marketing', amount: wallet.budgetMarketing, color: 'bg-green-500' },
            ].map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
                  <span>{b.label}</span>
                  <span>{Math.round((b.amount / (wallet.budgetTotal || 1)) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${b.color}`} 
                    style={{ width: `${(b.amount / (wallet.budgetTotal || 1)) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-bold text-white">€{b.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-instrument-serif text-white">Finanz-Historie</h3>
          <button className="text-xs font-bold text-[#FF9900] hover:underline">Alle Exporte</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5">
                <th className="px-6 py-4">Transaktion</th>
                <th className="px-6 py-4">Kategorie</th>
                <th className="px-6 py-4">Datum</th>
                <th className="px-6 py-4">Von</th>
                <th className="px-6 py-4 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {wallet.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/20">
                    Noch keine Transaktionen vorhanden.
                  </td>
                </tr>
              ) : (
                wallet.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {tx.type === 'deposit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-medium text-white">{tx.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-white/5 rounded text-white/60">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/40">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {tx.createdBy?.name || 'System'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-white'}`}>
                      {tx.type === 'deposit' ? '+' : '-'}€{tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
