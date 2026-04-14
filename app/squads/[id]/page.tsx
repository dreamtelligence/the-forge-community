'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AuthGuard from '@/components/AuthGuard';
import { motion } from 'framer-motion';
import {
  Users, Crown, TrendingUp, Wallet, ArrowLeft,
  Settings, UserPlus, Target, Zap, MessageSquare, FileText,
  ArrowUpRight, Shield, Lock, Globe} from 'lucide-react';
import Link from 'next/link';
import { SquadWalletView } from '@/components/squads/SquadWalletView';

// ... (rest of imports)

interface Squad {
  id: string;
  name: string;
  mission?: string;
  status: string;
  squadType: string;
  currentMembers: number;
  maxMembers: number;
  lead_id: string;
  lead_name?: string;
  createdAt: string;
  is_public: boolean;
  is_accepting_members: boolean;
  is_member: boolean;
  has_pending_invite: boolean;
  invite_id?: string | null;
  user_role?: string;
  members: Member[];
}

interface Member {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  equity_share?: number | null;
  hours_contributed: number;
  tasks_completed: number;
  joined_at: string;
}

interface Venture {
  id: string;
  name?: string;
  tagline?: string;
  status: string;
  current_phase: number;
  phase_completed: number;
}

interface VenturePhase {
  id: string;
  phase_number: number;
  phase_name: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
}

interface Wallet {
  balance: number;
  budgetTotal: number;
  budgetSamples: number;
  budgetProduction: number;
  budgetMarketing: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  createdAt: string;
  createdBy: { name: string };
}

export default function SquadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const squadId = params.id as string;

  const [squad, setSquad] = useState<Squad | null>(null);
  const [venture, setVenture] = useState<Venture | null>(null);
  const [phases, setPhases] = useState<VenturePhase[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteActionLoading, setInviteActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [inviteActionError, setInviteActionError] = useState('');
  const [applicationSent, setApplicationSent] = useState(false);

  const fetchSquadDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/squads/${squadId}`);
      if (!res.ok) throw new Error('Squad not found');

      const data = await res.json();
      setSquad(data.squad);
      setVenture(data.venture);
      setPhases(data.phases || []);
      setWallet(data.wallet);
      setTransactions(data.recent_transactions || []);
    } catch (err) {
      console.error('Error fetching squad:', err);
      router.push('/squads');
    } finally {
      setLoading(false);
    }
  }, [router, squadId]);

  useEffect(() => {
    setApplicationSent(false);
    setJoinError('');
    fetchSquadDetails();
  }, [fetchSquadDetails]);

  async function handleJoinSquad(message: string) {
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/squads/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad_id: squadId, message })
      });

      const data = await res.json();

      if (!res.ok) {
        setJoinError(data.error || 'Beitritt konnte nicht durchgeführt werden');
        return;
      }

      setShowJoinModal(false);
      setApplicationSent(true);
      await fetchSquadDetails();
    } catch (err: any) {
      setJoinError(err.message || 'Beitritt konnte nicht durchgeführt werden');
    } finally {
      setJoining(false);
    }
  }

  async function handleInvitationAction(action: 'accept' | 'decline') {
    if (!squad?.invite_id) return;

    setInviteActionLoading(action);
    setInviteActionError('');

    try {
      const res = await fetch(`/api/squads/invitations/${squad.invite_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Einladung konnte nicht aktualisiert werden');
      }

      if (action === 'decline') {
        router.push('/squads');
        return;
      }

      setApplicationSent(true);
      await fetchSquadDetails();
    } catch (err: any) {
      setInviteActionError(err.message || 'Einladung konnte nicht aktualisiert werden');
    } finally {
      setInviteActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <PageShell>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/40 uppercase tracking-[0.3em] text-xs font-bold">Loading Squad...</p>
            </div>
          </div>
        </PageShell>
      </AuthGuard>
    );
  }

  if (!squad) return null;

  const isLead = squad.user_role === 'lead';
  const isPublic = squad.is_public ?? true;
  const canApply = !squad.is_member
    && !squad.has_pending_invite
    && (squad.is_accepting_members ?? true)
    && isPublic;

  return (
    <AuthGuard>
      <PageShell>
        {/* Header */}
        <div className="mb-12">
          <Link href="/squads">
            <button className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-all mb-6 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs uppercase tracking-widest font-bold">Zurück zum Markt</span>
            </button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.3em] mb-4">
                <Shield className="w-3 h-3" />
                Squad Command Center
              </div>

              <h1 className="text-5xl md:text-6xl font-instrument-serif text-white mb-3">{squad.name}</h1>

              <p className="text-white/60 text-lg mb-6 max-w-2xl">
                {squad.mission || 'Keine Mission definiert.'}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={squad.status} />
                <TypeBadge type={squad.squadType} />
                {isPublic ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest">
                    <Globe className="w-3 h-3" />
                    Öffentlich
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-bold uppercase tracking-widest">
                    <Lock className="w-3 h-3" />
                    Privat
                  </span>
                )}
                {squad.has_pending_invite && !squad.is_member && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold uppercase tracking-widest">
                    <UserPlus className="w-3 h-3" />
                    Einladung offen
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {squad.has_pending_invite && !squad.is_member && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleInvitationAction('accept')}
                    disabled={inviteActionLoading !== null}
                    className="btn-shimmer bg-[var(--accent)] text-[var(--accent-foreground)] px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20 disabled:opacity-60"
                  >
                    <UserPlus className="w-5 h-5" />
                    {inviteActionLoading === 'accept' ? 'Nehme an...' : 'Einladung annehmen'}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => handleInvitationAction('decline')}
                    disabled={inviteActionLoading !== null}
                    className="px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all disabled:opacity-60"
                  >
                    {inviteActionLoading === 'decline' ? 'Lehne ab...' : 'Einladung ablehnen'}
                  </button>
                </>
              )}

              {canApply && !applicationSent && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setJoinError('');
                    setShowJoinModal(true);
                  }}
                  className="btn-shimmer bg-[var(--accent)] text-[var(--accent-foreground)] px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20"
                >
                  <UserPlus className="w-5 h-5" />
                  Jetzt beitreten
                </motion.button>
              )}

              {applicationSent && (
                <div className="px-8 py-4 rounded-xl border border-white/10 text-white/60 text-xs font-bold uppercase tracking-[0.2em] text-center">
                  {squad.has_pending_invite ? 'Einladung angenommen' : 'Beitritt erfolgreich'}
                </div>
              )}

              {isLead && (
                <Link href={`/squads/${squadId}/settings`}>
                  <button className="px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all">
                    <Settings className="w-5 h-5" />
                    Einstellungen
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {inviteActionError && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-300">
            {inviteActionError}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={Users}
            label="Team Größe"
            value={`${squad.currentMembers}/${squad.maxMembers}`}
            trend={`${Math.round((squad.currentMembers / squad.maxMembers) * 100)}% besetzt`}
          />
          <StatCard
            icon={Wallet}
            label="Budget"
            value={wallet?.balance ? `€${wallet.balance.toLocaleString()}` : '€0'}
            trend={wallet?.budgetTotal ? `von €${wallet.budgetTotal.toLocaleString()}` : 'Kein Budget'}
          />
          <StatCard
            icon={Target}
            label="Phase"
            value={venture?.current_phase ? `Phase ${venture.current_phase}/6` : 'Keine'}
            trend={venture?.status || 'Kein Venture'}
          />
          <StatCard
            icon={TrendingUp}
            label="Fortschritt"
            value={venture ? `${Math.round((venture.current_phase / 6) * 100)}%` : '0%'}
            trend={venture?.name || 'Nicht gestartet'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Team & Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Team Members */}
            <div className="glass-card rounded-[2rem] border border-white/10 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-instrument-serif text-white">Team Mitglieder</h2>
                <span className="text-xs uppercase tracking-widest font-bold text-white/40">
                  {squad.members?.length || 0} Aktiv
                </span>
              </div>

              <div className="space-y-4">
                {squad.members?.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>

            {/* Venture Phases */}
            {venture && phases.length > 0 && (
              <div className="glass-card rounded-[2rem] border border-white/10 p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-instrument-serif text-white">Venture Fortschritt</h2>
                  <span className="text-xs uppercase tracking-widest font-bold text-white/40">
                    Phase {venture.current_phase}/6
                  </span>
                </div>

                <div className="space-y-3">
                  {phases.map((phase) => (
                    <PhaseCard key={phase.id} phase={phase} isCurrent={phase.phase_number === venture.current_phase} />
                  ))}
                </div>
              </div>
            )}

            {/* Squad Wallet & Financial Transparency */}
            {wallet && (
              <SquadWalletView wallet={wallet as any} />
            )}

            {/* Quick Actions */}
            {squad.is_member && (
              <div className="grid grid-cols-2 gap-4">
                <QuickActionCard
                  icon={MessageSquare}
                  label="Squad Forum"
                  description="Private Diskussionen"
                  href={`/forum?squad=${squadId}`}
                />
                <QuickActionCard
                  icon={FileText}
                  label="Dokumente"
                  description="Geteilte Ressourcen"
                  href={`/resources?squad=${squadId}`}
                />
              </div>
            )}
          </div>

          {/* Right Column - Info & Actions */}
          <div className="space-y-8">
            {/* Venture Info */}
            {venture ? (
              <div className="glass-card rounded-[2rem] border border-white/10 p-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{venture.name || 'Unnamed Venture'}</h3>
                    <p className="text-xs uppercase tracking-widest text-white/40">Aktives Venture</p>
                  </div>
                </div>

                {venture.tagline && (
                  <p className="text-sm text-white/60 mb-6 italic">"{venture.tagline}"</p>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Aktuelle Phase</span>
                    <span className="text-sm font-bold text-white">{venture.current_phase}/6</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Abgeschlossen</span>
                    <span className="text-sm font-bold text-green-400">{venture.phase_completed} Phasen</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(venture.current_phase / 6) * 100}%` }}
                      className="h-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"
                    />
                  </div>

                  {squad.is_member && (
                    <Link href={`/ventures/${venture.id}`}>
                      <button className="w-full mt-4 bg-white text-black py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[var(--accent)] transition-all flex items-center justify-center gap-2 group">
                        Venture öffnen
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-[2rem] border border-dashed border-white/10 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Kein Venture</h3>
                <p className="text-sm text-white/40 mb-6">Starte euer erstes Venture-Projekt</p>
                {isLead && (
                  <Link href={`/ventures/new?squad=${squadId}`}>
                    <button className="bg-[var(--accent)] text-[var(--accent-foreground)] px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
                      Venture erstellen
                    </button>
                  </Link>
                )}
              </div>
            )}

            {/* Squad Info */}
            <div className="glass-card rounded-[2rem] border border-white/10 p-8">
              <h3 className="text-lg font-bold text-white mb-6">Squad Info</h3>
              <div className="space-y-4 text-sm">
                <InfoRow label="Gegründet" value={new Date(squad.createdAt).toLocaleDateString('de-DE')} />
                <InfoRow label="Lead" value={squad.lead_name || 'Unbekannt'} />
                <InfoRow label="Typ" value={squad.squadType} />
                <InfoRow label="Status" value={squad.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Join Modal */}
        {showJoinModal && (
          <JoinModal
            squad={squad}
            onClose={() => setShowJoinModal(false)}
            onJoin={handleJoinSquad}
            joining={joining}
            error={joinError}
          />
        )}
      </PageShell>
    </AuthGuard>
  );
}

// ===== COMPONENTS =====

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    forming: { color: 'emerald', label: 'Rekrutierung' },
    planning: { color: 'blue', label: 'Planung' },
    building: { color: 'orange', label: 'Execution' },
    launched: { color: 'purple', label: 'Live' },
  };

  const { color, label } = config[status] || { color: 'gray', label: status };

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 text-xs font-bold uppercase tracking-widest`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest capitalize">
      {type}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, trend }: any) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">{label}</span>
      </div>
      <div className="text-3xl font-instrument-serif text-white mb-1">{value}</div>
      <div className="text-xs text-white/40">{trend}</div>
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  const isLead = member.role === 'lead';
  const equityLabel =
    typeof member.equity_share === 'number' ? `${member.equity_share.toFixed(1)}%` : 'Offen';

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="p-5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-xl">
            {member.user_name?.charAt(0) || 'F'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-lg">{member.user_name}</h4>
              {isLead ? (
                <Crown className="w-4 h-4 text-[var(--accent)]" />
              ) : (
                <Users className="w-4 h-4 text-[var(--accent)]" />
              )}
            </div>
            <p className="text-xs text-white/40 uppercase tracking-widest">{member.role}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-white">{equityLabel}</div>
          <div className="text-xs text-white/40">Equity</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
        <div>
          <div className="text-xs text-white/40 mb-1">Stunden</div>
          <div className="text-sm font-bold text-white">{member.hours_contributed}h</div>
        </div>
        <div>
          <div className="text-xs text-white/40 mb-1">Aufgaben</div>
          <div className="text-sm font-bold text-white">{member.tasks_completed}</div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionCard({ icon: Icon, label, description, href }: any) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -4 }}
        className="glass-card rounded-2xl border border-white/10 p-6 hover:border-[var(--accent)]/30 transition-all cursor-pointer group"
      >
        <Icon className="w-8 h-8 text-[var(--accent)] mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="font-bold text-white mb-1">{label}</h3>
        <p className="text-xs text-white/40">{description}</p>
      </motion.div>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/60">{label}</span>
      <span className="font-bold text-white capitalize">{value}</span>
    </div>
  );
}

function PhaseCard({ phase, isCurrent }: { phase: VenturePhase; isCurrent: boolean }) {
  const progress = phase.total_tasks > 0 ? (phase.completed_tasks / phase.total_tasks) * 100 : 0;

  const statusConfig: Record<string, { color: string; label: string }> = {
    completed: { color: 'text-green-400', label: '✓' },
    in_progress: { color: 'text-[var(--accent)]', label: '→' },
    pending: { color: 'text-white/20', label: '○' },
  };

  const { color, label } = statusConfig[phase.status] || statusConfig.pending;

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className={`p-4 rounded-xl border transition-all ${
        isCurrent
          ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30'
          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${color}`}>{label}</span>
          <div>
            <h4 className="font-bold text-white text-sm">Phase {phase.phase_number}: {phase.phase_name}</h4>
            <p className="text-xs text-white/40">
              {phase.completed_tasks}/{phase.total_tasks} Aufgaben
            </p>
          </div>
        </div>
        {isCurrent && (
          <span className="px-2 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider">
            Aktiv
          </span>
        )}
      </div>

      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full ${
            phase.status === 'completed' ? 'bg-green-400' :
            phase.status === 'in_progress' ? 'bg-[var(--accent)]' :
            'bg-white/10'
          }`}
        />
      </div>
    </motion.div>
  );
}


function JoinModal({ squad, onClose, onJoin, joining, error }: any) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('');
  }, [squad?.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] w-full max-w-lg p-10 glass-card"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-6 text-[var(--accent)] text-4xl font-instrument-serif">
            {squad.name.charAt(0)}
          </div>
          <h2 className="text-3xl font-instrument-serif text-white mb-2">Squad beitreten</h2>
          <p className="text-white/60">
            Du trittst dem öffentlichen Squad <strong>{squad.name}</strong> direkt bei.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-xs text-white/40 mb-1">Mitgliedschaft</div>
            <div className="text-2xl font-bold text-white">
              Aktiv ab Beitritt
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/60">
            <p className="mb-2">Nach dem Beitritt erhältst du:</p>
            <ul className="space-y-1 text-xs">
              <li>• Zugriff auf Squad Forum & Resources</li>
              <li>• Mitbestimmungsrecht bei Entscheidungen</li>
              <li>• Beteiligung gemäß separater Squad-Absprachen</li>
            </ul>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2">
            Nachricht (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent)] transition-all resize-none"
            placeholder="Kurz sagen, warum du reinpasst."
          />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onJoin(message)}
            disabled={joining}
            className="flex-1 bg-[var(--accent)] text-[var(--accent-foreground)] px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50"
          >
            {joining ? 'Trete bei...' : 'Jetzt beitreten'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
