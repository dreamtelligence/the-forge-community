/**
 * AIGenerator - AI Content Generation UI
 * Used by: Legal Studio, Email Studio
 */

'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Copy, Check } from 'lucide-react';

interface AIGeneratorProps {
  onGenerate: () => Promise<string>;
  isGenerating: boolean;
  generatedContent?: string;
  brandContext?: {
    brandName: string;
    toneOfVoice?: string;
  };
  placeholder?: string;
  buttonText?: string;
}

type OutputMode = 'preview' | 'markdown' | 'plain';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'preview', label: 'Vorschau' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'plain', label: 'Klartext' },
];

const stripMarkdown = (value: string) => {
  return value
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?|```/gi, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '- ')
    .replace(/^\s{0,3}(\d+)\.\s+/gm, '$1. ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export function AIGenerator({
  onGenerate,
  isGenerating,
  generatedContent,
  brandContext,
  placeholder = 'KI-generierter Inhalt erscheint hier...',
  buttonText = 'Mit KI generieren',
}: AIGeneratorProps) {
  const [copied, setCopied] = useState<null | 'raw' | 'plain'>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>('preview');
  const rawContent = generatedContent ?? '';

  const plainContent = useMemo(() => stripMarkdown(rawContent), [rawContent]);
  const stats = useMemo(() => {
    const trimmed = rawContent.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = rawContent ? rawContent.split(/\r\n|\r|\n/).length : 0;
    return { words, lines, chars: rawContent.length };
  }, [rawContent]);

  const handleCopy = async (value: string, mode: 'raw' | 'plain') => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(mode);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="glass-card p-6 rounded-xl border border-white/10 space-y-4">
      {/* Brand Context Chip */}
      {brandContext && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-white/40">Verwendeter Marken-Kontext:</span>
          <span className="px-2 py-1 rounded-full bg-[#FF9900]/10 text-[#FF9900] font-bold">
            {brandContext.brandName}
          </span>
          {brandContext.toneOfVoice && (
            <span className="px-2 py-1 rounded-full bg-white/5 text-white/60 font-medium">
              {brandContext.toneOfVoice}
            </span>
          )}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full px-6 py-3 rounded-xl bg-[#FF9900] text-black font-bold hover:bg-[#FF9900] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin" />
            Generiere...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {buttonText}
          </>
        )}
      </button>

      {/* Generated Output */}
      {generatedContent ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40">Ansicht</span>
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                {OUTPUT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setOutputMode(mode.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.25em] transition-all ${
                      outputMode === mode.id
                        ? 'bg-[#FF9900] text-black'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(rawContent, 'raw')}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors flex items-center gap-2"
                title="Markdown kopieren"
              >
                {copied === 'raw' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
                Markdown
              </button>
              <button
                onClick={() => handleCopy(plainContent, 'plain')}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors flex items-center gap-2"
                title="Klartext kopieren"
              >
                {copied === 'plain' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
                Klartext
              </button>
            </div>
          </div>

          <div className="text-xs text-white/40 flex flex-wrap gap-3">
            <span>{stats.words} Wörter</span>
            <span>{stats.chars} Zeichen</span>
            <span>{stats.lines} Zeilen</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 max-h-[600px] overflow-y-auto">
            {outputMode === 'preview' ? (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-white/90
                prose-headings:text-white prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-4
                prose-p:text-white/80 prose-p:my-2
                prose-strong:text-[#FF9900] prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-4 prose-ul:my-2
                prose-ol:list-decimal prose-ol:pl-4 prose-ol:my-2
                prose-li:text-white/70 prose-li:my-1
                prose-a:text-[#FF9900] prose-a:underline hover:prose-a:text-white transition-colors
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {rawContent}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className={`text-sm text-white/90 whitespace-pre-wrap leading-relaxed ${
                outputMode === 'markdown' ? 'font-mono' : 'font-sans'
              }`}>
                {outputMode === 'plain' ? plainContent : rawContent}
              </pre>
            )}
          </div>
        </div>
      ) : (
        !isGenerating && (
          <div className="p-8 rounded-xl bg-white/[0.02] border border-white/5 text-center">
            <Sparkles className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">{placeholder}</p>
          </div>
        )
      )}
    </div>
  );
}
