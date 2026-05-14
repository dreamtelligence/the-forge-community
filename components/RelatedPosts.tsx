'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare } from 'lucide-react';

interface RelatedPost {
  id: string;
  author: string;
  content: string;
  category: string;
  likes: number;
  createdTime: string;
  score?: number;
}

interface RelatedPostsProps {
  postId: string;
  content: string;
  category: string;
}

export function RelatedPosts({ postId, content, category }: RelatedPostsProps) {
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRelatedPosts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch('/api/forum/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content, category }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      if (Array.isArray(data)) {
        setRelatedPosts(data.slice(0, 3)); // Show top 3
      }
    } catch (e) {
      console.error('Related posts error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [postId, content, category]);

  useEffect(() => {
    fetchRelatedPosts();
  }, [fetchRelatedPosts]);

  if (loading) {
    return (
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-32 bg-white/5 rounded animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || relatedPosts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 pt-6 border-t border-white/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-white/40" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
          Ähnliche Diskussionen
        </h4>
      </div>

      <div className="space-y-2">
        {relatedPosts.map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group"
          >
            <a
              href={`#${post.id}`}
              className="block p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-[var(--accent)]/30 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      {post.category}
                    </span>
                    <span className="text-[9px] text-white/40">
                      von {post.author.split(' ')[0]}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </a>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
