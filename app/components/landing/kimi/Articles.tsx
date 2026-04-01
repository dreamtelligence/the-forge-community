'use client';

import { motion } from 'framer-motion';

const articles = [
  {
    id: 0,
    title: 'Realistic AI Prompts',
    category: 'AI GUIDE',
    date: 'Feb 2026',
    excerpt: 'Nutze die Sprache der Fotografie: Kamera + Linse + Licht + 1-2 technische Details. So sparst du Credits durch bessere Ersttreffer.',
    image: '/images/article-1.jpg',
    featured: true,
  },
  {
    id: 1,
    title: 'Sourcing Playbook',
    category: 'B2B',
    date: 'Feb 2026',
    excerpt:
      'Lieferanten finden, verhandeln, sampeln – Schritt für Schritt im Forge Workflow.',
    image: '/images/article-1.jpg',
    featured: false,
  },
  {
    id: 2,
    title: 'Brand Sprint',
    category: 'Brand',
    date: 'Feb 2026',
    excerpt:
      'In 7 Tagen von Idee zu Brand DNA, Tone und Visual System.',
    image: '/images/article-2.jpg',
    featured: false,
  },
  {
    id: 3,
    title: 'Campaign Sprint',
    category: 'Marketing',
    date: 'Feb 2026',
    excerpt:
      'Creative Direction für D2C – wie du Assets generierst, die verkaufen.',
    image: '/vans.webp',
    featured: true,
  },
];

export default function Articles() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  return (
    <section className="py-16 lg:py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="mb-12 lg:mb-16"
        >
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            Playbooks
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid sm:grid-cols-2 gap-6 lg:gap-8"
        >
          {articles.map((article) => (
            <motion.article
              key={article.id}
              variants={itemVariants}
              className={`group cursor-pointer ${article.featured ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <div
                className={`relative overflow-hidden rounded-2xl border border-white/5 ${
                  article.featured ? 'aspect-[4/3]' : 'aspect-[3/4]'
                }`}
              >
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05] group-hover:-rotate-1"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    {article.category === 'AI GUIDE' ? (
                       <span className="relative overflow-hidden rounded-md bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        <span className="relative z-10">{article.category}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 translate-x-[-150%] animate-[shimmer_2s_infinite]" />
                      </span>
                    ) : (
                      <span className="text-white/70 text-xs uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                        {article.category}
                      </span>
                    )}
                    
                    {article.date && (
                      <span className="text-white/50 text-xs font-mono">{article.date}</span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-white text-lg font-semibold mb-2 group-hover:text-royal transition-colors">{article.title}</h3>
                    <p className={`text-sm leading-relaxed line-clamp-2 ${article.category === 'AI GUIDE' ? 'text-white font-bold' : 'text-white/60'}`}>{article.excerpt}</p>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
