'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import PageShell from '@/components/PageShell';
import { deleteVenture, getVenture, updateVentureTask, addVentureCost, getVentureCosts } from '@/app/actions/ventures';
import { Calendar, CheckCircle2, Circle, AlertCircle, Plus, DollarSign, Clock, Zap, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { NotionExportButton } from '@/shared/integrations/notion';

export default function VentureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ventureId = params.id as string;

  const [venture, setVenture] = useState<any>(null);
  const [costs, setCosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'costs' | 'timeline'>('tasks');
  const [showAddCost, setShowAddCost] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadVenture();
  }, [ventureId]);

  const loadVenture = async () => {
    try {
      const [ventureData, costsData] = await Promise.all([
        getVenture(ventureId),
        getVentureCosts(ventureId)
      ]);
      setVenture(ventureData);
      setCosts(costsData);
    } catch (error) {
      console.error('Failed to load venture:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    await updateVentureTask(taskId, { status: newStatus });
    loadVenture();
  };

  const handleAddCost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await addVentureCost(ventureId, {
      category: formData.get('category') as string,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      isRecurring: formData.get('isRecurring') === 'on',
      frequency: formData.get('frequency') as string
    });

    setShowAddCost(false);
    loadVenture();
    (e.target as HTMLFormElement).reset();
  };

  const handleDeleteVenture = async () => {
    if (!ventureId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteVenture(ventureId);
      router.push('/ventures');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Löschen fehlgeschlagen';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-[#FF9900]" />;
      case 'BLOCKED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-white/30" />;
    }
  };

  const getTotalCosts = () => {
    return costs.reduce((sum, cost) => sum + cost.amount, 0);
  };

  const getRecurringCosts = () => {
    return costs.filter(c => c.isRecurring).reduce((sum, cost) => sum + cost.amount, 0);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <PageShell>
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[#FF9900] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/30 text-sm">Lade Venture...</p>
          </div>
        </PageShell>
      </AuthGuard>
    );
  }

  if (!venture) {
    return (
      <AuthGuard>
        <PageShell>
          <div className="text-center py-20">
            <p className="text-white/30">Venture nicht gefunden</p>
          </div>
        </PageShell>
      </AuthGuard>
    );
  }
  const ventureTypeLabel = venture.typeLabel || (() => {
    switch (venture.type) {
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
        return venture.type;
    }
  })();

  return (
    <AuthGuard>
      <PageShell>
        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 sm:gap-6 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-instrument-serif text-white tracking-tight mb-4">
                {venture.name}
              </h1>
              <p className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">
                {ventureTypeLabel} • Phase {venture.currentPhase}/6
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <NotionExportButton
                ventureId={ventureId}
                ventureName={venture.name}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white"
              />
              <Link
                href={`/forge/${ventureId}`}
                className="flex items-center justify-center gap-2 bg-linear-to-r from-[#FF9900] to-[#FF9900] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:brightness-110 transition-all flex-1 sm:flex-initial"
              >
                <Zap className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Open Forge</span>
              </Link>
              <span className={`px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-widest whitespace-nowrap ${
                venture.status === 'LAUNCHED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                venture.status === 'IN_PROGRESS' ? 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20' :
                'bg-white/5 text-white/30 border border-white/10'
              }`}>
                {venture.status}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                Venture Fortschritt
              </span>
              <span className="text-xs text-[#FF9900] font-bold">
                {Math.round((venture.currentPhase / 6) * 100)}%
              </span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-[#FF9900] to-[#FF5500] rounded-full transition-all duration-500"
                style={{ width: `${(venture.currentPhase / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps - Horizontal Scroll on Mobile */}
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex sm:grid sm:grid-cols-6 gap-2 min-w-max sm:min-w-0">
              {venture.steps.map((step: any) => (
                <div
                  key={step.id}
                  className={`flex-shrink-0 w-[140px] sm:w-auto p-3 sm:p-4 rounded-xl border transition-all ${
                    step.status === 'COMPLETED'
                      ? 'bg-green-500/10 border-green-500/20'
                      : step.status === 'IN_PROGRESS'
                      ? 'bg-[#FF9900]/10 border-[#FF9900]/20'
                      : 'bg-white/2 border-white/5'
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] font-bold text-white/40 mb-1">Step {step.stepNumber}</div>
                  <div className="text-[10px] sm:text-xs text-white font-medium line-clamp-2">{step.stepName}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          {[
            { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
            { id: 'costs', label: 'Kosten', icon: DollarSign },
            { id: 'timeline', label: 'Timeline', icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-[#FF9900] border-[#FF9900]'
                    : 'text-white/40 border-transparent hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {venture.tasks && venture.tasks.length > 0 ? (
              venture.tasks.map((task: any) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

                return (
                  <div
                    key={task.id}
                    className={`glass-card rounded-2xl border p-6 transition-all ${
                      isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleTaskStatusChange(
                          task.id,
                          task.status === 'DONE' ? 'TODO' : 'DONE'
                        )}
                        className="mt-1"
                      >
                        {getTaskStatusIcon(task.status)}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className={`text-lg font-instrument-serif ${
                            task.status === 'DONE' ? 'text-white/40 line-through' : 'text-white'
                          }`}>
                            {task.title}
                          </h3>
                          {task.priority && (
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                              task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                              task.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
                              task.priority === 'MEDIUM' ? 'bg-[#FF9900]/10 text-[#FF9900]' :
                              'bg-white/5 text-white/30'
                            }`}>
                              {task.priority}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm text-white/50 mb-3">{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs">
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 ${
                              isOverdue ? 'text-red-500' : 'text-white/40'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString('de-DE')}
                              {isOverdue && ' (ÜBERFÄLLIG)'}
                            </span>
                          )}
                          <span className="text-white/30">•</span>
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="DONE">Done</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-white/30">
                Keine Tasks vorhanden
              </div>
            )}
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <div>
            {/* Cost Summary */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="glass-card rounded-2xl border border-white/10 p-6">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                  Gesamt-Kosten
                </div>
                <div className="text-3xl font-instrument-serif text-white">
                  €{getTotalCosts().toLocaleString()}
                </div>
              </div>
              <div className="glass-card rounded-2xl border border-white/10 p-6">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                  Wiederkehrend/Monat
                </div>
                <div className="text-3xl font-instrument-serif text-[#FF9900]">
                  €{getRecurringCosts().toLocaleString()}
                </div>
              </div>
              <div className="glass-card rounded-2xl border border-white/10 p-6">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                  Budget
                </div>
                <div className="text-3xl font-instrument-serif text-white">
                  €{venture.totalBudget?.toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Add Cost Button */}
            <button
              onClick={() => setShowAddCost(!showAddCost)}
              className="mb-6 inline-flex items-center gap-2 bg-[#FF9900] text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" />
              Kosten hinzufügen
            </button>

            {/* Add Cost Form */}
            {showAddCost && (
              <form onSubmit={handleAddCost} className="glass-card rounded-2xl border border-white/10 p-6 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                      Kategorie
                    </label>
                    <select
                      name="category"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="DEVELOPMENT">Development</option>
                      <option value="OPERATIONS">Operations</option>
                      <option value="LEGAL">Legal</option>
                      <option value="OTHER">Sonstiges</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="z.B. Google Ads"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                      Betrag (€)
                    </label>
                    <input
                      type="number"
                      name="amount"
                      required
                      step="0.01"
                      placeholder="99.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                      Typ
                    </label>
                    <select
                      name="frequency"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                    >
                      <option value="ONCE">Einmalig</option>
                      <option value="MONTHLY">Monatlich</option>
                      <option value="YEARLY">Jährlich</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" name="isRecurring" id="isRecurring" className="rounded" />
                  <label htmlFor="isRecurring" className="text-xs text-white/60">
                    Wiederkehrende Kosten
                  </label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="bg-[#FF9900] text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110"
                  >
                    Hinzufügen
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCost(false)}
                    className="bg-white/5 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}

            {/* Cost List */}
            <div className="space-y-3">
              {costs.map((cost) => (
                <div key={cost.id} className="glass-card rounded-xl border border-white/10 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white font-medium">{cost.name}</div>
                    <div className="text-xs text-white/40 uppercase tracking-widest">
                      {cost.category} {cost.isRecurring && `• ${cost.frequency}`}
                    </div>
                  </div>
                  <div className="text-lg font-instrument-serif text-[#FF9900]">
                    €{cost.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="glass-card rounded-2xl border border-white/10 p-8">
            <h3 className="text-2xl font-instrument-serif text-white mb-6">
              Venture Timeline
            </h3>
            <div className="space-y-6">
              {venture.tasks
                ?.filter((t: any) => t.dueDate)
                .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((task: any) => (
                  <div key={task.id} className="flex gap-4">
                    <div className="text-xs text-white/40 w-24">
                      {new Date(task.dueDate).toLocaleDateString('de-DE')}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${task.status === 'DONE' ? 'text-white/40 line-through' : 'text-white'}`}>
                        {task.title}
                      </div>
                    </div>
                    {getTaskStatusIcon(task.status)}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <section className="mt-12">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-300 mb-2">Danger Zone</div>
                <h3 className="text-2xl font-instrument-serif text-white">Venture löschen</h3>
                <p className="text-sm text-white/50 mt-2 max-w-xl">
                  Löscht alle zugehörigen Steps, Tasks, Kosten und Assets. Dieser Vorgang ist endgültig.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">
                <Trash2 className="h-4 w-4" />
                irreversible
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Tippe DELETE zur Bestätigung
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-red-400"
                />
                {deleteError && (
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-red-300">
                    {deleteError}
                  </p>
                )}
              </div>
              <button
                onClick={handleDeleteVenture}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-40"
              >
                {isDeleting ? 'Löscht...' : 'Venture löschen'}
              </button>
            </div>
          </div>
        </section>
      </PageShell>
    </AuthGuard>
  );
}
