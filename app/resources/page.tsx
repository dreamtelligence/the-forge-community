'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/PageShell';
import { BookOpen, Search, Sparkles, Target, Zap, ArrowRight, Play, Clock, Layers, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { restoreGermanUmlauts } from '@/lib/utils/text';

interface TrainingCourse {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  category: string;
  level?: string | null;
  coverImage?: string | null;
  durationMins?: number | null;
  modulesCount: number;
}

const categoryStyles: Record<string, { gradient: string; icon: typeof Sparkles; color: string }> = {
  'Go-To-Market': { 
    gradient: 'from-[#1c1c1c] via-[#2b1f14] to-[#0b0b0b]', 
    icon: Target,
    color: 'text-orange-400'
  },
  Distribution: { 
    gradient: 'from-[#151515] via-[#13212b] to-[#0a0a0a]', 
    icon: Zap,
    color: 'text-blue-400'
  },
  Strategy: { 
    gradient: 'from-[#1a1a1a] via-[#2c2410] to-[#0b0b0b]', 
    icon: Sparkles,
    color: 'text-[#FF9900]'
  },
  Legal: {
    gradient: 'from-[#141414] via-[#1e1a14] to-[#0b0b0b]',
    icon: Scale,
    color: 'text-emerald-300'
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

export default function ResourcesPage() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    async function fetchTraining() {
      try {
        setLoading(true);
        const response = await fetch('/api/training');
        if (!response.ok) throw new Error('Failed to fetch training');
        const data = await response.json();
        setCourses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Training load error:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTraining();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(courses.map((course) => course.category).filter(Boolean));
    return ['All', ...Array.from(unique)];
  }, [courses]);

  const filteredCourses = courses.filter((course) => {
    const query = search.toLowerCase();
    const title = restoreGermanUmlauts(course.title).toLowerCase();
    const summary = restoreGermanUmlauts(course.summary || '').toLowerCase();
    const matchesSearch = title.includes(query) || summary.includes(query);
    const matchesCategory =
      filterCategory === 'All' || course.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <PageShell>
      <div className="relative">
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FF9900]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-[#FF9900]/3 rounded-full blur-[80px] pointer-events-none" />

        <header className="mb-16 relative">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-[#FF9900] mb-6"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Forge Academy
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-instrument-serif text-white tracking-tight mb-6"
          >
            Wissen, das zu <br />
            <span className="text-gradient-gold italic">Wachstum wird.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/50 max-w-2xl leading-relaxed"
          >
            Keine Theorie-Wüsten, sondern kampferprobte Systeme. 
            Direkt aus der Praxis für Gründer, die keine Zeit für Blabla haben.
          </motion.p>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col md:flex-row gap-4 mb-12"
        >
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-[#FF9900] transition-colors" />
            <input
              type="text"
              placeholder="Suche nach Systemen, Playbooks oder Modulen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-[#FF9900]/50 focus:border-[#FF9900]/30 outline-none transition-all text-sm text-white placeholder:text-white/20 backdrop-blur-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "px-6 py-4 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap border uppercase tracking-wider",
                  filterCategory === cat
                    ? "bg-[#FF9900] text-black border-[#FF9900] shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                    : "bg-white/5 text-white/40 border-white/10 hover:text-white hover:border-white/20 hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-white/5 rounded-4xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 p-20 text-center backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-[#FF9900]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-[#FF9900]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nichts gefunden</h3>
            <p className="text-white/40 max-w-xs mx-auto">Keine Schulungen entsprechen deiner aktuellen Suche. Versuche es mit anderen Begriffen.</p>
            <button 
              onClick={() => { setSearch(''); setFilterCategory('All'); }}
              className="mt-6 text-[10px] font-bold uppercase tracking-widest text-[#FF9900] hover:text-white transition-colors"
            >
              Filter zurücksetzen
            </button>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 xl:grid-cols-3 gap-8"
          >
            <AnimatePresence mode='popLayout'>
              {filteredCourses.map((course) => {
                const style = categoryStyles[course.category] || categoryStyles.Strategy;
                const displayCategory = restoreGermanUmlauts(course.category);
                const displayTitle = restoreGermanUmlauts(course.title);
                const displaySummary = restoreGermanUmlauts(course.summary || '');
                const Icon = style.icon;

                return (
                  <motion.div
                    key={course.id}
                    variants={itemVariants}
                    layout
                    className="group"
                  >
                    <Link
                      href={`/resources/${course.slug}`}
                      className="block h-full glass-card rounded-4xl border border-white/10 overflow-hidden hover:border-[#FF9900]/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                    >
                      <div className={cn("relative h-44 bg-linear-to-br overflow-hidden", style.gradient)}>
                        {/* Abstract pattern overlay */}
                        <div className="absolute inset-0 opacity-20 bg-grid-small" />
                        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.2),_transparent_70%)]" />
                        
                        <div className="absolute top-6 left-6 flex items-center gap-2">
                          <div className="p-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                            <Icon className={cn("w-4 h-4", style.color)} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                            {displayCategory}
                          </span>
                        </div>

                        <div className="absolute bottom-6 left-6">
                          <span className="px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-[#FF9900]">
                            {course.level || 'OPERATOR'}
                          </span>
                        </div>

                        {/* Hover Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="w-14 h-14 bg-[#FF9900] rounded-full flex items-center justify-center text-black transform scale-75 group-hover:scale-100 transition-transform duration-500 shadow-xl">
                            <Play className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                      </div>

                      <div className="p-8 space-y-4">
                        <h3 className="text-xl font-bold text-white leading-tight group-hover:text-[#FF9900] transition-colors line-clamp-2">
                          {displayTitle}
                        </h3>
                        <p className="text-sm text-white/40 line-clamp-2 leading-relaxed font-medium">
                          {displaySummary || 'Entdecke die Systeme hinter erfolgreichen Growth-Strategien.'}
                        </p>
                        
                        <div className="pt-2 flex items-center justify-between border-t border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{course.modulesCount} Module</span>
                            </div>
                            {course.durationMins ? (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{course.durationMins} Min</span>
                              </div>
                            ) : null}
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#FF9900] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
