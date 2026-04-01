import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import ForgeAIContextSetter from '@/app/components/forge/ForgeAIContextSetter';
import { VentureTour } from '@/app/components/onboarding/VentureTour';

export default async function ForgeDashboardPage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) return notFound();

  const { ventureId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return notFound();

  // Fetch venture with related data
  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      OR: [
        { ownerId: user.id },
        {
          squad: {
            members: {
              some: { userId: user.id, leftAt: null }
            }
          }
        }
      ]
    },
    include: {
      brandDNA: true,
      tasks: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { assignedTo: { select: { name: true, email: true } } }
      },
      costs: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  if (!venture) return notFound();

  // Stats
  const totalTasks = await prisma.ventureTask.count({
    where: { ventureId: venture.id }
  });

  const completedTasks = await prisma.ventureTask.count({
    where: { ventureId: venture.id, status: 'DONE' }
  });

  const overdueTasks = await prisma.ventureTask.count({
    where: {
      ventureId: venture.id,
      status: { not: 'DONE' },
      dueDate: { lt: new Date() }
    }
  });

  const totalCosts = venture.costs.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <VentureTour initialHasSeenTour={user.hasSeenTour} />
      <ForgeAIContextSetter
        context={`Forge Dashboard - ${venture.name}. Hilf dem Founder mit Priorisierung, Launch-Plan und Marketing.`}
      />
      {/* Header */}
      <div>
        <h1 className="text-4xl font-instrument-serif text-white mb-2">
          Dashboard
        </h1>
        <p className="text-white/40 text-sm hidden md:block">
          Overview of {venture.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-tour="stats-grid">
        <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10">
          <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1 sm:mb-2">
            Progress
          </p>
          <p className="text-xl sm:text-3xl font-instrument-serif text-white mb-0.5 sm:mb-1">
            {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
          </p>
          <p className="text-[10px] sm:text-xs text-white/60">
            {completedTasks}/{totalTasks} tasks
          </p>
        </div>

        <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10">
          <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1 sm:mb-2">
            Status
          </p>
          <p className="text-xl sm:text-3xl font-instrument-serif text-white mb-0.5 sm:mb-1 capitalize truncate">
            {venture.status.toLowerCase().replace('_', ' ')}
          </p>
          <p className="text-[10px] sm:text-xs text-white/60">
            Phase {venture.currentPhase}/6
          </p>
        </div>

        <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10">
          <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1 sm:mb-2">
            Budget
          </p>
          <p className="text-xl sm:text-3xl font-instrument-serif text-white mb-0.5 sm:mb-1">
            €{totalCosts.toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs text-white/60">
            Total spent
          </p>
        </div>

        <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10">
          <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1 sm:mb-2">
            Alerts
          </p>
          <p className="text-xl sm:text-3xl font-instrument-serif text-white mb-0.5 sm:mb-1">
            {overdueTasks}
          </p>
          <p className="text-[10px] sm:text-xs text-white/60">
            Overdue tasks
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Brand DNA */}
        <Link
          href={`/forge/${venture.id}/brand`}
          data-tour="brand-dna-card"
          className="glass-card p-6 rounded-2xl border border-white/10 hover:border-[#FF9900]/30 transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-instrument-serif text-white">
              Brand DNA
            </h3>
            {venture.brandDNA ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            )}
          </div>
          <p className="text-sm text-white/60 mb-4">
            {venture.brandDNA
              ? 'Configure your brand identity and AI context'
              : 'Set up brand identity for AI-powered content'}
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF9900] group-hover:gap-3 transition-all">
            {venture.brandDNA ? 'Edit' : 'Setup'} <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Marketing */}
        <Link
          href={`/forge/${venture.id}/marketing`}
          data-tour="marketing-card"
          className="glass-card p-6 rounded-2xl border border-white/10 hover:border-[#FF9900]/30 transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-instrument-serif text-white">
              Marketing
            </h3>
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-sm text-white/60 mb-4">
            AI-powered campaigns, content, and analytics
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF9900] group-hover:gap-3 transition-all">
            Launch <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Sourcing */}
        <Link
          href={`/forge/${venture.id}/sourcing`}
          data-tour="sourcing-card"
          className="glass-card p-6 rounded-2xl border border-white/10 hover:border-[#FF9900]/30 transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-instrument-serif text-white">
              Sourcing
            </h3>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-sm text-white/60 mb-4">
            Find suppliers, order samples, track production
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF9900] group-hover:gap-3 transition-all">
            Explore <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Recent Tasks */}
      <div className="glass-card p-6 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-instrument-serif text-white">
            Recent Tasks
          </h2>
          <Link
            href="/tasks"
            className="text-xs font-bold text-[#FF9900] hover:text-[#FF9900] transition-colors"
          >
            View All
          </Link>
        </div>

        {venture.tasks.length > 0 ? (
          <div className="space-y-3">
            {venture.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5"
              >
                <div className="flex-1">
                  <h4 className="text-sm text-white font-medium mb-1">
                    {task.title}
                  </h4>
                  {task.assignedTo && (
                    <p className="text-xs text-white/40">
                      Assigned to {task.assignedTo.name || task.assignedTo.email}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    task.status === 'DONE'
                      ? 'bg-green-500/10 text-green-400'
                      : task.status === 'IN_PROGRESS'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-gray-500/10 text-gray-400'
                  }`}
                >
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-8">
            No tasks yet. Create your first task to get started.
          </p>
        )}
      </div>
    </div>
  );
}
