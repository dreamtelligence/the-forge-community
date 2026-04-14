'use client';

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import AuthGuard from '@/components/AuthGuard';
import { Circle, Clock, CheckCircle2, AlertCircle, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface Task {
  id: string;
  task: string;
  description: string;
  assignedTo: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  category: 'Legal' | 'WMS' | 'Marketing' | 'Operations';
}

const statusIcons = {
  'To Do': Circle,
  'In Progress': Clock,
  'Done': CheckCircle2,
};


const priorityColors = {
  High: 'border-l-4 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.05)]',
  Medium: 'border-l-4 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.05)]',
  Low: 'border-l-4 border-white/5 shadow-none',
};

const categoryColors = {
  Legal: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  WMS: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Marketing: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
  Operations: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Alle');

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
    );

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const translatedFilterMap: Record<string, string> = {
    'Alle': 'All',
    'Offen': 'To Do',
    'Läuft': 'In Progress',
    'Fertig': 'Done'
  };


  const filteredTasks =
    filter === 'Alle' ? tasks : tasks.filter((t) => t.status === translatedFilterMap[filter]);

  const filters = ['Alle', 'Offen', 'Läuft', 'Fertig'];

  const toDoCount = tasks.filter((t) => t.status === 'To Do').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;

  return (
    <AuthGuard>
      <PageShell>
        <header className="mb-16 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.3em] mb-6">
            <Target className="w-3 h-3" />
            Operations-Management
          </div>
          <h1 className="text-5xl md:text-6xl font-instrument-serif text-white tracking-tight mb-4">Mission Control</h1>
          <p className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">Alle Aufgaben und Verantwortlichkeiten im Überblick.</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Offen" value={toDoCount} icon={Circle} color="text-white/20" />
          <StatCard title="In Bearbeitung" value={inProgressCount} icon={Clock} color="text-blue-500" />
          <StatCard title="Abgeschlossen" value={doneCount} icon={CheckCircle2} color="text-green-500" />
        </div>

        <div className="mb-12 flex gap-3 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 border ${
                filter === f
                  ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                  : 'bg-white/5 text-white/40 border-white/5 hover:text-white hover:border-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-24 text-center">
            <div className="w-10 h-10 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest animate-pulse">Lade Missionen...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="glass-card rounded-[2rem] border border-dashed border-white/10 p-24 text-center">
            <p className="text-white/20 font-black uppercase tracking-[0.4em] text-sm">Keine aktiven Aufgaben gefunden.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTasks.map((task, idx) => {
              const Icon = statusIcons[task.status];
              const isOverdue =
                task.status !== 'Done' &&
                task.dueDate &&
                new Date(task.dueDate) < new Date();

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  key={task.id}
                  className={`glass-card rounded-3xl border border-white/10 p-8 flex flex-col group hover:border-[var(--accent)]/30 transition-all duration-700 relative overflow-hidden ${priorityColors[task.priority]}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${categoryColors[task.category] || 'bg-white/5 text-white/40'}`}>
                      {task.category}
                    </span>
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-500 border-white/10 ${task.status === 'Done' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-white/5 text-white/20'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-xl font-instrument-serif text-white mb-3 leading-tight group-hover:text-[var(--accent)] transition-colors duration-500">{task.task}</h3>
                  <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-10 leading-relaxed line-clamp-3">{task.description}</p>

                  <div className="mt-auto border-t border-white/5 pt-6 relative z-10">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/20 mb-6">
                      <span className="text-white/40">{task.assignedTo || 'Nicht zugewiesen'}</span>
                      <span className={`${isOverdue ? 'text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : ''}`}>
                        {isOverdue && <AlertCircle className="w-3 h-3 inline mr-1.5" />}
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : 'TBA'}
                      </span>
                    </div>

                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                      className="w-full bg-white/[0.03] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-3 outline-none focus:border-[var(--accent)] cursor-pointer transition-all hover:bg-white/5 appearance-none"
                    >
                      <option value="To Do">Offen</option>
                      <option value="In Progress">Läuft</option>
                      <option value="Done">Erledigt</option>
                    </select>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="glass-card p-8 rounded-3xl border border-white/10 relative overflow-hidden group">
      <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">{title}</span>
      </div>
      <div className="text-4xl font-instrument-serif text-white">{value}</div>
    </div>
  );
}
