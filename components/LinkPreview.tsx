'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  aiSummary?: string;
}

/**
 * Utility: Extract YouTube ID from URL
 */
export function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const youtubeId = getYouTubeId(url);

  useEffect(() => {
    // If it's a YouTube video, we might not even need the API preview, 
    // but we'll fetch it anyway for title/description
    fetchPreview();
  }, [fetchPreview, url]);

  async function fetchPreview() {
    setLoading(true);
    setError(false);

    try {
      const response = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) throw new Error('Failed to fetch preview');

      const data = await response.json();
      setPreview(data);
    } catch (err) {
      console.error('Link preview error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="my-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse">
        <div className="h-4 bg-white/5 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/5 rounded w-1/2"></div>
      </div>
    );
  }

  if (youtubeId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-6 space-y-3"
      >
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            className="w-full h-full"
          ></iframe>
        </div>
        {preview && (
          <div className="px-2">
            <h4 className="text-sm font-bold text-white/90">{preview.title}</h4>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">YouTube Video</p>
          </div>
        )}
      </motion.div>
    );
  }

  if (error || !preview) {
    // Fallback: just show the link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
      >
        {url}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="block my-4 group"
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-[var(--accent)]/30 transition-all">
        {preview.image && (
          <div className="aspect-video w-full bg-white/5 overflow-hidden">
            <img
              src={preview.image}
              alt={preview.title || 'Preview'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-bold text-white text-sm line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              {preview.title || 'Untitled'}
            </h4>
            <ExternalLink className="w-4 h-4 text-white/40 flex-shrink-0 group-hover:text-[var(--accent)] transition-colors" />
          </div>

          {preview.description && (
            <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">
              {preview.description}
            </p>
          )}

          {preview.aiSummary && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-purple-400 font-bold leading-relaxed">
                AI Summary: {preview.aiSummary}
              </p>
            </div>
          )}

          {preview.siteName && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">
                {preview.siteName}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.a>
  );
}

/**
 * Utility: Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  return text.match(urlRegex) || [];
}

/**
 * Utility: Replace URLs in markdown with LinkPreview components
 * Returns array of text/LinkPreview segments
 */
export function renderWithLinkPreviews(text: string): Array<{ type: 'text' | 'link'; content: string }> {
  const urls = extractUrls(text);
  if (urls.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: Array<{ type: 'text' | 'link'; content: string }> = [];
  let lastIndex = 0;

  urls.forEach((url) => {
    const index = text.indexOf(url, lastIndex);
    if (index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, index) });
    }
    segments.push({ type: 'link', content: url });
    lastIndex = index + url.length;
  });

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}
