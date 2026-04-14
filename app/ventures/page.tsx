'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import PageShell from '@/components/PageShell';
import { deleteVenture, getUserVentures } from '@/app/actions/ventures';
import { Plus, Rocket, Clock, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

export default function VenturesPage() {
  const [ventures, setVentures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadVentures();
  }, []);

  const loadVentures = async () => {
    try {
      const data = await getUserVentures();
      setVentures(data);
    } catch (error) {
      console.error('Failed to load ventures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (ventureId: string) => {
    setDeletingId(ventureId);
    setDeleteError(null);
    try {
      await deleteVenture(ventureId);
      setVentures(prev => prev.filter(venture => venture.id !== ventureId));
      setConfirmDeleteId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Löschen fehlgeschlagen';
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LAUNCHED':
        return <Rocket className="w-5 h-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-[#FF9900]" />;
      case 'PAUSED':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-white/30" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LAUNCHED':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'IN_PROGRESS':
        return 'text-[#FF9900] bg-[#FF9900]/10 border-[#FF9900]/20';
      case 'PAUSED':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default:
        return 'text-white/30 bg-white/5 border-white/10';
    }
  };

  const getTypeLabel = (venture: any) => {
    if (venture?.typeLabel) return venture.typeLabel;
    switch (venture?.type) {
      case 'ECOMMERCE':
        return 'E-Commerce';
      case 'SAAS':
        return 'SaaS';
      case 'SERVICE':
        return 'Service';
      case 'INFLUENCER':
        return 'Influencer';
      case 'MARKETPLACE':
        return 'Marketplace';
      case 'AGENCY':
        return 'Agency';
      case 'OTHER':
        return 'Sonstiges';
      default:
        return venture?.type || '—';
    }
  };

  return (
    <AuthGuard>
      <PageShell>
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-instrument-serif text-white tracking-tight mb-4">
              Ventures
            </h1>
            <p className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">
              Deine Brand-Building Projekte
            </p>
          </div>
          <Link
            href="/ventures/new"
            className="inline-flex items-center gap-3 bg-[#FF9900] text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Neues Venture
          </Link>
        </header>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[#FF9900] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/30 text-sm">Lade Ventures...</p>
          </div>
        ) : ventures.length === 0 ? (
          <div className="glass-card rounded-3xl border border-white/10 p-16 text-center">
            <Rocket className="w-16 h-16 text-white/20 mx-auto mb-6" />
            <h2 className="text-2xl font-instrument-serif text-white mb-3">
              Noch keine Ventures
            </h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">
              Starte dein erstes Venture und nutze den strukturierten Workflow von Idee bis Launch.
            </p>
            <Link
              href="/ventures/new"
              className="inline-flex items-center gap-3 bg-[#FF9900] text-black px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" />
              Erstes Venture erstellen
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ventures.map((venture) => (
              <div
                key={venture.id}
                className="glass-card rounded-3xl border border-white/10 p-8 hover:border-[#FF9900]/40 transition-all group"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-6">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${getStatusColor(venture.status)}`}>
                    {getStatusIcon(venture.status)}
                    {venture.status}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                      {getTypeLabel(venture)}
                    </span>
                    <button
                      onClick={() => setConfirmDeleteId(venture.id)}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                      aria-label="Venture löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link href={`/ventures/${venture.id}`} className="block">
                  {/* Venture Info */}
                  <h3 className="text-2xl font-instrument-serif text-white mb-2 group-hover:text-[#FF9900] transition-colors">
                    {venture.name}
                  </h3>
                  {venture.description && (
                    <p className="text-sm text-white/50 mb-6 line-clamp-2">
                      {venture.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                        Fortschritt
                      </span>
                      <span className="text-xs text-[#FF9900] font-bold">
                        {venture.currentPhase}/6
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF9900] rounded-full transition-all duration-500"
                        style={{ width: `${(venture.currentPhase / 6) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks Preview */}
                  {venture.tasks && venture.tasks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-3">
                        Nächste Tasks
                      </p>
                      {venture.tasks.slice(0, 2).map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 text-xs text-white/50"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                      {venture.tasks.length > 2 && (
                        <p className="text-[9px] text-white/20 font-bold">
                          +{venture.tasks.length - 2} weitere
                        </p>
                      )}
                    </div>
                  )}

                  {/* Completed Tasks Count */}
                  {venture._count && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <p className="text-xs text-white/40">
                        <span className="text-[#FF9900] font-bold">{venture._count.tasks}</span> Tasks erledigt
                      </p>
                    </div>
                  )}
                </Link>

                {confirmDeleteId === venture.id && (
                  <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-red-200 font-bold mb-3">
                      Venture wirklich löschen?
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => handleDelete(venture.id)}
                        disabled={deletingId === venture.id}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-60"
                      >
                        {deletingId === venture.id ? 'Löscht...' : 'Löschen'}
                      </button>
                    </div>
                    {deleteError && (
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-red-200">
                        {deleteError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
