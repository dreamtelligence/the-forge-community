'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PageShell from '@/app/components/PageShell';
import { ChevronLeft, BookOpen, Sparkles, Clock, Layers, CheckCircle2, Share2, Bookmark, ArrowRight, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { restoreGermanUmlauts } from '@/lib/text-utils';

type TrainingModule = {
  id: string;
  order: number;
  title: string;
  summary?: string | null;
  content: string;
};

type TrainingCourse = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  category: string;
  level?: string | null;
  coverImage?: string | null;
  durationMins?: number | null;
  modules: TrainingModule[];
};

export default function TrainingDetailPage() {
  const params = useParams();
  const slug = useMemo(() => {
    const raw = params?.slug;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[“”„"'’`]/g, '')
      .replace(/[^a-z0-9äöüß]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isSummaryDuplicated = (summary: string, content: string) => {
    const cleanSummary = normalizeText(restoreGermanUmlauts(summary));
    if (!cleanSummary) return false;
    const slice = normalizeText(
      restoreGermanUmlauts(content).slice(0, Math.max(600, summary.length + 200))
    );
    return slice.startsWith(cleanSummary) || slice.includes(cleanSummary);
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/training/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Training not found');
        return res.json();
      })
      .then((data) => {
        setCourse(data);
        if (data.modules?.length > 0) {
          setActiveModule(`module-${data.modules[0].order}`);
        }
      })
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [slug]);

  // Handle intersection observer to highlight active module in sidebar
  useEffect(() => {
    if (!course) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveModule(entry.target.id);
          }
        });
      },
      { threshold: 0.2, rootMargin: '-10% 0% -60% 0%' }
    );

    course.modules.forEach((module) => {
      const el = document.getElementById(`module-${module.order}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [course]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white/40 gap-6">
        <div className="w-12 h-12 border-2 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initalisiere Wissenstransfer...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/40 font-bold uppercase tracking-widest text-xs">
        Dossier nicht gefunden.
      </div>
    );
  }

  return (
    <PageShell>
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-12">
        <Link 
          href="/resources" 
          className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#FF9900] transition-all"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#FF9900]/50 group-hover:bg-[#FF9900]/10 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </div>
          Academy Übersicht
        </Link>
        <div className="flex gap-3">
          <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Section - Refined */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-20 rounded-[3rem] border border-white/10 overflow-hidden glass-card shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-small opacity-20" />
        <div className="relative p-10 md:p-16 lg:p-20">
          <div className="flex flex-wrap items-center gap-4 mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FF9900]/20 bg-[#FF9900]/5 text-[10px] font-black uppercase tracking-widest text-[#FF9900]">
              <Sparkles className="w-3.5 h-3.5" />
            {restoreGermanUmlauts(course.category)}
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
              <Clock className="w-3.5 h-3.5" />
              {course.durationMins || '45'} Min
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
              <Layers className="w-3.5 h-3.5" />
              {course.modules.length} Module
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-instrument-serif text-white tracking-tight max-w-5xl mb-8 leading-[0.9]">
            {restoreGermanUmlauts(course.title)}
          </h1>
          <p className="text-xl md:text-2xl text-white/50 max-w-3xl leading-relaxed font-medium">
            {restoreGermanUmlauts(course.summary || '')}
          </p>

          <div className="mt-12 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
               <BookOpen className="w-7 h-7 text-[#FF9900]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">Dossier-Level</div>
              <div className="text-base font-bold text-white uppercase tracking-widest">{course.level || 'OPERATOR TRACK'}</div>
            </div>
          </div>
        </div>
        
        {/* Decorative Background Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#FF9900]/10 rounded-full blur-[120px] pointer-events-none" />
      </motion.section>

      {/* Main Content Layout */}
      <div className="grid lg:grid-cols-[340px_1fr] gap-16 relative">
        
        {/* Sticky Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-8">
            <div className="rounded-[2.5rem] border border-white/10 bg-[#0a0a0a] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Struktur</h3>
                <span className="text-[10px] font-black text-[#FF9900] tracking-widest">{course.modules.length} SEKTIONEN</span>
              </div>
              
              <div className="space-y-2">
                {course.modules.map((module) => {
                  const id = `module-${module.order}`;
                  const isActive = activeModule === id;
                  
                  return (
                    <a
                      key={module.id}
                      href={`#${id}`}
                      className={cn(
                        "group flex items-center gap-4 rounded-2xl px-5 py-4 border transition-all duration-500",
                        isActive 
                          ? "bg-[#FF9900] border-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20" 
                          : "bg-transparent border-transparent text-white/30 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors shrink-0",
                        isActive ? "text-black/60" : "text-white/10"
                      )}>
                        {module.order.toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs font-black truncate tracking-tight uppercase">{module.title}</span>
                      {isActive && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Community Box */}
            <div className="rounded-[2.5rem] border border-[#FF9900]/10 bg-[#FF9900]/5 p-8 relative overflow-hidden group">
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-[#FF9900] uppercase tracking-[0.3em] mb-4">Support & Feedback</h4>
                <p className="text-sm text-white/50 leading-relaxed mb-6 font-medium">
                  Hast du Fragen zu diesem Modul? Tausch dich mit anderen Foundern im Squad-Channel aus.
                </p>
                <Link 
                  href="/squads" 
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:text-[#FF9900] transition-colors"
                >
                  Zum Channel wechseln <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <Sparkles className="w-32 h-32 text-[#FF9900]" />
              </div>
            </div>
          </div>
        </aside>

        {/* Modules List */}
        <div className="space-y-24 pb-40">
          {course.modules.map((module, index) => (
            <motion.section
              key={module.id}
              id={`module-${module.order}`}
              // FIX: Reduced margin and use opacity by default if index is 0
              initial={{ opacity: index === 0 ? 1 : 0, y: index === 0 ? 0 : 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: index === 0 ? 0.2 : 0 }}
              className="group scroll-mt-24"
            >
              <div className="relative bg-[#0a0a0a] rounded-[3.5rem] border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-700 shadow-2xl">
                <div className="p-10 md:p-16 lg:p-20">
                  <header className="mb-12">
                    <div className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-[#FF9900] mb-6">
                      <span className="w-12 h-px bg-[#FF9900]/30" />
                      MODUL {module.order.toString().padStart(2, '0')}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-instrument-serif text-white tracking-tight leading-[1.1]">
                      {restoreGermanUmlauts(module.title)}
                    </h2>
                  </header>

                  {module.summary && !isSummaryDuplicated(module.summary, module.content) && (
                    <div className="mb-16 p-8 rounded-3xl bg-white/[0.02] border border-white/5 border-l-4 border-l-[#FF9900] relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Zap className="w-12 h-12 text-[#FF9900]" />
                      </div>
                      <p className="text-lg md:text-xl font-medium text-white/70 italic leading-relaxed relative z-10">
                        "{restoreGermanUmlauts(module.summary)}"
                      </p>
                    </div>
                  )}

                  {/* PROSE OPTIMIZATION */}
                  <div className="prose prose-invert prose-lg max-w-none
                    prose-headings:text-white prose-headings:font-instrument-serif prose-headings:tracking-tight prose-headings:mb-8 prose-headings:mt-16
                    prose-h2:text-4xl prose-h2:text-left prose-h2:mt-20 prose-h2:mb-10
                    prose-h3:text-3xl prose-h3:text-left
                    prose-p:text-white/60 prose-p:leading-[1.8] prose-p:mb-6 prose-p:text-lg prose-p:font-medium prose-p:text-left
                    prose-strong:text-white prose-strong:font-bold
                    prose-ul:list-none prose-ul:pl-0 prose-ul:mb-10 prose-ul:space-y-4 prose-ul:mt-6
                    prose-li:text-white/50 prose-li:text-lg prose-li:pl-8 prose-li:relative prose-li:leading-relaxed
                    prose-li:before:content-[''] prose-li:before:absolute prose-li:before:left-0 prose-li:before:top-[0.7em] prose-li:before:w-2 prose-li:before:h-2 prose-li:before:bg-[#FF9900] prose-li:before:rounded-full
                    prose-a:text-[#FF9900] prose-a:no-underline prose-a:font-bold border-b border-[#FF9900]/20 hover:border-[#FF9900] transition-all
                    prose-code:bg-white/5 prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:text-[#FF9900] prose-code:before:content-none prose-code:after:content-none prose-code:text-sm
                    prose-pre:bg-[#050505] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-[2rem] prose-pre:p-10 prose-pre:shadow-inner
                    prose-blockquote:border-l-4 prose-blockquote:border-l-[#FF9900] prose-blockquote:bg-white/5 prose-blockquote:p-10 prose-blockquote:rounded-r-[2.5rem] prose-blockquote:italic prose-blockquote:text-white/70 prose-blockquote:text-xl
                    prose-img:rounded-[2.5rem] prose-img:border prose-img:border-white/10 prose-img:shadow-2xl
                    prose-hr:border-white/5 prose-hr:my-12
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {restoreGermanUmlauts(module.content)}
                    </ReactMarkdown>
                  </div>
                </div>
                
                {/* Visual module divider accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-white/[0.03] to-transparent pointer-events-none" />
              </div>
            </motion.section>
          ))}

          {/* Training Completion Footer */}
          <footer className="pt-20 pb-20 text-center">
             <div className="w-24 h-px bg-white/10 mx-auto mb-12" />
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
             >
               <h3 className="text-3xl md:text-4xl font-instrument-serif text-white mb-6">Wissen erfolgreich assimiliert.</h3>
               <p className="text-white/30 text-lg mb-12 font-medium max-w-md mx-auto">Du hast dieses Training abgeschlossen. Wende das Gelernte jetzt in deinen Ventures an.</p>
               <Link 
                href="/resources"
                className="inline-flex items-center gap-4 px-10 py-5 bg-[#FF9900] text-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:shadow-2xl hover:shadow-[#FF9900]/30 transition-all hover:-translate-y-1 active:scale-95"
               >
                Weitere Trainings erkunden <ArrowRight className="w-4 h-4" />
               </Link>
             </motion.div>
          </footer>
        </div>
      </div>
    </PageShell>
  );
}
