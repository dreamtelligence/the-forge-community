'use client';

import { useCallback, useEffect, useState } from 'react';
import PageShell from '@/app/components/PageShell';
import AuthGuard from '@/app/components/AuthGuard';
import { Target, ArrowUpRight, TrendingUp, Lock, Unlock, Plus, Search, Sparkles, Globe, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Squad {
  id: string;
  name: string;
  mission?: string;
  status: string;
  squad_type: string;
  current_members: number;
  max_members: number;
  lead_name?: string;
  created_at: string;
  is_public: boolean;
  is_accepting_members: boolean;
  slots_available?: number;
  my_role?: string;
}

const statusConfig: Record<string, { color: string, label: string, icon: any }> = {
  'forming': { color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10', label: 'Rekrutierung', icon: Unlock },
  'planning': { color: 'text-blue-500 border-blue-500/20 bg-blue-500/10', label: 'Planung', icon: Target },
  'building': { color: 'text-orange-500 border-orange-500/20 bg-orange-500/10', label: 'Execution', icon: Zap },
  'launched': { color: 'text-purple-500 border-purple-500/20 bg-purple-500/10', label: 'Live', icon: TrendingUp },
};

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'my-squads'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [applyTarget, setApplyTarget] = useState<Squad | null>(null);
  const [inviteTarget, setInviteTarget] = useState<Squad | null>(null);
  const [appliedSquadIds, setAppliedSquadIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSquads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/squads?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setSquads(data.squads || []);
      }
    } catch (e) {
      console.error('Error fetching squads:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSquads();
  }, [fetchSquads]);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
  };

  const updateVisibility = async (
    squadId: string,
    updates: Partial<Pick<Squad, 'is_public' | 'is_accepting_members'>>
  ) => {
    const snapshot = squads;
    setSquads(prev =>
      prev.map(squad => (squad.id === squadId ? { ...squad, ...updates } : squad))
    );

    try {
      const res = await fetch('/api/squads/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad_id: squadId, ...updates })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Visibility update failed');
      }

      if (data.squad) {
        setSquads(prev =>
          prev.map(squad => (squad.id === squadId ? { ...squad, ...data.squad } : squad))
        );
      }

      showNotice('success', 'Squad-Sichtbarkeit aktualisiert.');
    } catch (error: any) {
      console.error('Visibility update failed:', error);
      setSquads(snapshot);
      showNotice('error', error.message || 'Sichtbarkeit konnte nicht gespeichert werden.');
    }
  };

  const filteredSquads = squads.filter(squad =>
    squad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    squad.mission?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const publicSquads = filteredSquads.filter(squad => squad.is_public);
  const privateSquads = filteredSquads.filter(squad => !squad.is_public);

  const renderSquadGrid = (items: Squad[]) => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <AnimatePresence mode="popLayout">
        {items.map((squad, idx) => {
          const config = statusConfig[squad.status] || statusConfig['forming'];
          const Icon = config.icon;
          const fillPercent = Math.min((squad.current_members / squad.max_members) * 100, 100);
          const isMySquadView = filter === 'my-squads';
          const slotsAvailable = typeof squad.slots_available === 'number'
            ? squad.slots_available
            : squad.max_members - squad.current_members;
          const canApply = !isMySquadView && squad.is_public && squad.is_accepting_members && slotsAvailable > 0;
          const hasApplied = appliedSquadIds.includes(squad.id);
          const showLeadControls = filter === 'my-squads' && squad.my_role === 'lead';

          return (
            <motion.div
              key={squad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="group relative glass-card rounded-[2.5rem] border border-white/10 hover:border-(--accent)/30 transition-all duration-700 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="absolute inset-0 bg-linear-to-br from-white/2 to-transparent pointer-events-none" />

              <div className="p-10 pb-0 relative z-10 flex justify-between items-start">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-(--accent) text-3xl font-instrument-serif shadow-2xl group-hover:border-(--accent)/50 transition-all duration-700">
                  {squad.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.color}`}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </span>
                  {squad.is_public ? (
                    <Globe className="w-4 h-4 text-green-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-white/40" />
                  )}
                </div>
              </div>

              <div className="p-10 pb-6 relative z-10 flex-1">
                <h3 className="text-3xl font-instrument-serif text-white mb-2 group-hover:text-(--accent) transition-colors duration-700">{squad.name}</h3>
                <p className="text-sm text-white/50 mb-6 line-clamp-2 min-h-10">
                  {squad.mission || 'Keine Mission definiert.'}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-white/3 p-5 rounded-2xl border border-white/5">
                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Squad Type</div>
                    <div className="text-lg font-instrument-serif text-white capitalize">{squad.squad_type}</div>
                  </div>
                  <div className="bg-white/3 p-5 rounded-2xl border border-white/5">
                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Lead</div>
                    <div className="text-lg font-instrument-serif text-white truncate">
                      {squad.lead_name || 'TBD'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                    <span>Founders Board</span>
                    <span className="text-(--accent)">{squad.current_members} / {squad.max_members} Plätze</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fillPercent}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-(--accent) shadow-[0_0_10px_var(--accent)]"
                    />
                  </div>
                  <div className="flex -space-x-3 mt-6">
                    {[...Array(squad.max_members)].map((_, i) => (
                      <div key={i} className={`w-9 h-9 rounded-full border-2 border-[#08090A] flex items-center justify-center text-[10px] font-black shadow-xl transition-transform hover:scale-110 relative ${
                        i < squad.current_members ? 'bg-(--accent) text-black' : 'bg-white/5 text-white/10'
                      }`}>
                        {i < squad.current_members ? 'F' : '+'}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                    <span>Bewerbungen</span>
                    <span className={squad.is_accepting_members ? 'text-emerald-400' : 'text-white/40'}>
                      {squad.is_accepting_members ? 'Offen' : 'Geschlossen'}
                    </span>
                  </div>
                </div>

                {showLeadControls && (
                  <div className="mt-8 space-y-3 rounded-2xl border border-white/5 bg-white/2 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-white">Öffentlich sichtbar</div>
                        <div className="text-[10px] text-white/40">Im Markt sichtbar machen.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateVisibility(squad.id, { is_public: !squad.is_public })}
                        aria-pressed={squad.is_public}
                        className={`relative h-7 w-12 rounded-full border border-white/10 transition ${
                          squad.is_public ? 'bg-(--accent) text-black' : 'bg-white/10 text-white'
                        }`}
                      >
                        <span
                          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-black/80 transition ${
                            squad.is_public ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-white">Bewerbungen offen</div>
                        <div className="text-[10px] text-white/40">Neue Founder zulassen.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateVisibility(squad.id, { is_accepting_members: !squad.is_accepting_members })}
                        aria-pressed={squad.is_accepting_members}
                        className={`relative h-7 w-12 rounded-full border border-white/10 transition ${
                          squad.is_accepting_members ? 'bg-(--accent) text-black' : 'bg-white/10 text-white'
                        }`}
                      >
                        <span
                          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-black/80 transition ${
                            squad.is_accepting_members ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInviteTarget(squad)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-(--accent)/50 hover:text-white transition-all"
                    >
                      Mitglied einladen
                    </button>
                  </div>
                )}
              </div>

              <div className="p-10 pt-0 relative z-10 mt-auto">
                {canApply ? (
                  <button
                    type="button"
                    disabled={hasApplied}
                    onClick={() => setApplyTarget(squad)}
                    className="w-full bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-(--accent) transition-all duration-500 shadow-2xl active:scale-[0.98] flex justify-center items-center gap-3 group/btn disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {hasApplied ? 'Bewerbung gesendet' : 'Bewerben'}
                    {!hasApplied && <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                  </button>
                ) : (
                  <Link href={`/squads/${squad.id}`}>
                    <button className="w-full bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-(--accent) transition-all duration-500 shadow-2xl active:scale-[0.98] flex justify-center items-center gap-3 group/btn">
                      Details ansehen
                      <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </button>
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <AuthGuard>
      <PageShell>
        <header className="mb-16 flex flex-col md:flex-row justify-between items-end gap-8 relative">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent)/10 border border-(--accent)/20 text-[10px] font-bold text-(--accent) uppercase tracking-[0.3em] mb-6">
              <Sparkles className="w-3 h-3" />
              Verfügbare Operationen
            </div>
            <h1 className="text-5xl md:text-6xl font-instrument-serif text-white tracking-tight mb-4">Squad Markt</h1>
            <p className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">Investiere Zeit & Kapital in High-Performance Teams.</p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="glass-card px-8 py-6 rounded-3xl border border-white/10 flex gap-12 relative z-10">
              <div>
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Gesamtwert</div>
                <div className="text-3xl font-instrument-serif text-white tracking-tight">€ 0</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Aktive Squads</div>
                <div className="text-3xl font-instrument-serif text-white tracking-tight">{squads.length}</div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="btn-shimmer bg-(--accent) text-(--accent-foreground) px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl shadow-(--accent)/20"
            >
              <Plus className="w-5 h-5" />
              Squad Gründen
            </motion.button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="flex gap-2 bg-(--surface-muted) p-1 rounded-lg border border-(--border)">
            {(['open', 'all', 'my-squads'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === f
                    ? 'bg-(--accent) text-(--accent-foreground) shadow-lg'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {f === 'open' && 'Offen'}
                {f === 'all' && 'Alle'}
                {f === 'my-squads' && 'Meine'}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Squad suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-(--surface) border border-(--border) rounded-lg pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-(--accent) transition-all"
            />
          </div>
        </div>

        {notice && (
          <div className={`mb-10 rounded-2xl border px-6 py-4 flex items-center justify-between ${
            notice.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}>
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">{notice.message}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <div key={i} className="h-112.5 bg-white/5 rounded-[2.5rem] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredSquads.length === 0 ? (
          <div className="glass-card rounded-[2.5rem] border border-dashed border-white/10 p-24 text-center">
            <p className="text-white/20 font-black uppercase tracking-[0.4em] text-sm mb-8">
              {filter === 'my-squads' && 'Du bist noch in keinem Squad.'}
              {filter === 'open' && 'Aktuell keine öffentlichen Squads.'}
              {filter === 'all' && 'Noch keine Squads.'}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="bg-(--accent) text-(--accent-foreground) px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Erstes Squad Gründen
              </motion.button>
          </div>
        ) : filter === 'all' ? (
          <div className="space-y-16">
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white">Öffentliche Squads</h2>
                  <p className="text-xs text-white/40 uppercase tracking-[0.3em]">Offen für Bewerbungen & Sichtbar im Markt</p>
                </div>
              </div>
              {publicSquads.length === 0 ? (
                <div className="rounded-4xl border border-dashed border-white/10 bg-white/2 p-10 text-center">
                  <p className="text-white/30 text-xs font-bold uppercase tracking-[0.3em]">
                    Aktuell keine öffentlichen Squads.
                  </p>
                </div>
              ) : (
                renderSquadGrid(publicSquads)
              )}
            </section>

            {privateSquads.length > 0 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white">Private Squads</h2>
                  <p className="text-xs text-white/40 uppercase tracking-[0.3em]">Nur sichtbar für eingeladene Founder</p>
                </div>
                {renderSquadGrid(privateSquads)}
              </section>
            )}
          </div>
        ) : (
          renderSquadGrid(filteredSquads)
        )}

        {/* Create Modal */}
        <CreateSquadModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSquads();
          }}
        />
        <ApplyModal
          squad={applyTarget}
          onClose={() => setApplyTarget(null)}
          onApplied={(squadId) => {
            setAppliedSquadIds(prev => (prev.includes(squadId) ? prev : [...prev, squadId]));
            showNotice('success', 'Bewerbung gesendet.');
            setApplyTarget(null);
          }}
        />
        <InviteModal
          squad={inviteTarget}
          onClose={() => setInviteTarget(null)}
          onInvited={() => {
            showNotice('success', 'Einladung gesendet.');
            setInviteTarget(null);
          }}
        />
      </PageShell>
    </AuthGuard>
  );
}

function CreateSquadModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    mission: '',
    squad_type: 'venture',
    max_members: 5,
    is_public: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/squads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create squad');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-(--surface) border border-(--border) rounded-[2.5rem] w-full max-w-2xl p-10 glass-card shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-instrument-serif text-white mb-2">Squad Gründen</h2>
            <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Baue dein High-Performance Team</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2">
              Squad Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-(--background) border border-(--border) rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-(--accent) transition-all"
              placeholder="z.B. EcoWear Collective"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2">
              Mission Statement
            </label>
            <textarea
              value={formData.mission}
              onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
              rows={3}
              className="w-full bg-(--background) border border-(--border) rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-(--accent) transition-all resize-none"
              placeholder="Woran arbeitet dein Squad? Was ist das Ziel?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2">
                Squad Type
              </label>
              <select
                value={formData.squad_type}
                onChange={(e) => setFormData({ ...formData, squad_type: e.target.value })}
                className="w-full bg-(--background) border border-(--border) rounded-xl px-4 py-4 text-white focus:outline-none focus:border-(--accent) transition-all"
              >
                <option value="venture">Venture (Brand Building)</option>
                <option value="project">Project (One-Time)</option>
                <option value="experiment">Experiment (Testing)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2">
                Max. Members
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={formData.max_members}
                onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
                className="w-full bg-(--background) border border-(--border) rounded-xl px-4 py-4 text-white focus:outline-none focus:border-(--accent) transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-(--background) border border-(--border)">
            <div>
              <div className="text-sm font-bold text-white mb-1">Öffentlich</div>
              <div className="text-xs text-white/40">Andere Founder können beitreten</div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
              className={`relative w-14 h-8 rounded-full transition-all ${
                formData.is_public ? 'bg-(--accent)' : 'bg-white/20'
              }`}
            >
              <motion.div
                animate={{ x: formData.is_public ? 24 : 0 }}
                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-shimmer bg-(--accent) text-(--accent-foreground) px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-(--accent)/20"
            >
              {loading ? 'Gründe...' : 'Squad Gründen'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ApplyModal({
  squad,
  onClose,
  onApplied
}: {
  squad: Squad | null;
  onClose: () => void;
  onApplied: (squadId: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (squad) {
      setMessage('');
      setLoading(false);
      setError('');
    }
  }, [squad?.id]);

  if (!squad) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/squads/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad_id: squad.id, message })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Bewerbung konnte nicht gesendet werden');
      }

      onApplied(squad.id);
    } catch (err: any) {
      setError(err.message || 'Bewerbung konnte nicht gesendet werden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-(--surface) border border-(--border) rounded-[2.5rem] w-full max-w-xl p-10 glass-card shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-instrument-serif text-white mb-2">Bewerbung senden</h2>
            <p className="text-white/40 text-xs uppercase tracking-[0.3em]">An den Squad Lead</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <div className="text-xs text-white/40 uppercase tracking-[0.3em]">Squad</div>
            <div className="text-2xl font-instrument-serif text-white">{squad.name}</div>
            <p className="text-sm text-white/50 mt-2">{squad.mission || 'Keine Mission definiert.'}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2">
              Nachricht (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full bg-(--background) border border-(--border) rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-(--accent) transition-all resize-none"
              placeholder="Warum passt du in das Squad? Kurz & konkret."
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-shimmer bg-(--accent) text-(--accent-foreground) px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-(--accent)/20"
            >
              {loading ? 'Sende...' : 'Bewerbung senden'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function InviteModal({
  squad,
  onClose,
  onInvited
}: {
  squad: Squad | null;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (squad) {
      setIdentifier('');
      setLoading(false);
      setError('');
    }
  }, [squad?.id]);

  if (!squad) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/squads/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad_id: squad.id, identifier: identifier.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Einladung konnte nicht gesendet werden');
      }

      onInvited();
    } catch (err: any) {
      setError(err.message || 'Einladung konnte nicht gesendet werden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-(--surface) border border-(--border) rounded-[2.5rem] w-full max-w-xl p-10 glass-card shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-instrument-serif text-white mb-2">Founder einladen</h2>
            <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Direkt ins Squad</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleInvite} className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <div className="text-xs text-white/40 uppercase tracking-[0.3em]">Squad</div>
            <div className="text-2xl font-instrument-serif text-white">{squad.name}</div>
            <p className="text-sm text-white/50 mt-2">{squad.mission || 'Keine Mission definiert.'}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2">
              Email oder User-ID
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="founder@email.com oder user_id"
              className="w-full bg-(--background) border border-(--border) rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-(--accent) transition-all"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="flex-1 btn-shimmer bg-(--accent) text-(--accent-foreground) px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-(--accent)/20"
            >
              {loading ? 'Sende...' : 'Einladung senden'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
