'use client';

import { useRef, useState, useEffect } from 'react';
import {
  Image as ImageIcon, Eye, Code, Smile, Bold, Italic, List, Link as LinkIcon, X,
  Palette, AlignLeft, AlignCenter, AlignRight, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { VoiceInput } from '@/app/components/VoiceInput';
import { MediaGeneratorModal } from '@/app/components/marketing/MediaGeneratorModal';
import { FORUM_MEDIA_TAG } from '@/lib/forum-venture';

interface ForumEditorProps {
  value: string;
  onChange: (value: string | ((prev: string) => string)) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  submitLabel?: string;
  showCancel?: boolean;
  className?: string;
  markdownComponents?: any;
  mediaVentureId?: string | null;
  enableImageGenerator?: boolean;
}

interface HeroSettings {
  bg?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const META_REGEX = /<!--metadata: ({[\s\S]*}) -->$/;

export function ForumEditor({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  placeholder = "Was brennt dir auf der Seele?",
  minHeight = "200px",
  autoFocus = false,
  onCancel,
  submitLabel = "Posten",
  showCancel = false,
  className = "",
  markdownComponents,
  mediaVentureId = null,
  enableImageGenerator = false
}: ForumEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVisualTools, setShowVisualTools] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [] = useState({ width: 320, height: 400 });
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    color: '#ffffff',
    align: 'left',
    size: 'md'
  });

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Prevent body scroll when emoji picker is open on mobile
  useEffect(() => {
    if (showEmojiPicker && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showEmojiPicker]);

  useEffect(() => {
    const match = value.match(META_REGEX);
    if (match && match[1]) {
      try {
        const meta = JSON.parse(match[1]);
        setHeroSettings(prev => ({ ...prev, ...meta }));
        setShowVisualTools(true);
      } catch (e) { console.error('Meta parse error', e); }
    }
  }, [value]);

  const updateMetadata = (newSettings: Partial<HeroSettings>) => {
    const nextSettings = { ...heroSettings, ...newSettings };
    setHeroSettings(nextSettings);
    const cleanValue = value.replace(META_REGEX, '').trimEnd();
    const metaString = `\n\n<!--metadata: ${JSON.stringify(nextSettings)} -->`;
    onChange(cleanValue + metaString);
  };

  const toggleVisualMode = () => {
    if (showVisualTools) {
      const cleanValue = value.replace(META_REGEX, '').trimEnd();
      onChange(cleanValue);
      setShowVisualTools(false);
    } else {
      const metaString = `\n\n<!--metadata: ${JSON.stringify(heroSettings)} -->`;
      onChange(value.trimEnd() + metaString);
      setShowVisualTools(true);
    }
  };

  const insertText = (text: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
      onChange(value + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + text + value.substring(end);
    onChange(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const formatText = (format: 'bold' | 'italic' | 'list' | 'link') => {
    const textarea = editorRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.substring(start, end);
    const hasSelection = start !== end;

    const apply = (replacement: string, selStart: number, selEnd: number) => {
      const next = value.substring(0, start) + replacement + value.substring(end);
      onChange(next);
      if (textarea) setTimeout(() => { textarea.focus(); textarea.setSelectionRange(selStart, selEnd); }, 0);
    };

    if (format === 'bold') {
      const body = hasSelection ? selected : 'Fett';
      apply(`**${body}**`, start + 2, start + 2 + body.length);
    } else if (format === 'italic') {
      const body = hasSelection ? selected : 'Kursiv';
      apply(`_${body}_`, start + 1, start + 1 + body.length);
    } else if (format === 'link') {
      const text = hasSelection ? selected : 'Link';
      apply(`[${text}](https://)`, start + text.length + 3, start + text.length + 3 + 8);
    } else {
      const body = hasSelection ? selected.split('\n').map(l => l ? `- ${l}` : '- ').join('\n') : '- Liste';
      apply(body, hasSelection ? start : start + 2, start + body.length);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isBg = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setStatusMessage('❌ Nur Bilder erlaubt.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage('❌ Max. 5 MB.');
      return;
    }

    setStatusMessage(isBg ? '🎨 Hintergrund...' : '🚀 Upload...');
    try {
      const safeName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const response = await fetch(`/api/forum/upload?filename=${encodeURIComponent(safeName)}`, {
        method: 'POST',
        headers: { 'content-type': file.type || 'application/octet-stream' },
        body: file,
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Upload failed');

      if (isBg) {
        updateMetadata({ bg: data.url });
      } else {
        insertText(`\n![${file.name}](${data.url})\n`);
      }
      setStatusMessage('✅');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (_error: any) {
      setStatusMessage('❌ Fehler');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleOpenGenerator = () => {
    if (!mediaVentureId) {
      setStatusMessage('❌ Forum-Workspace fehlt.');
      setTimeout(() => setStatusMessage(''), 2500);
      return;
    }
    setShowImageGenerator(true);
  };

  const handleAssetCreated = (asset: { url?: string; type?: string }) => {
    if (!asset?.url || asset.type === 'video') return;
    insertText(`\n![Forum Image](${asset.url})\n`);
    setStatusMessage('✅ Bild eingefügt.');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {enableImageGenerator && mediaVentureId && (
        <MediaGeneratorModal
          isOpen={showImageGenerator}
          onClose={() => setShowImageGenerator(false)}
          ventureId={mediaVentureId}
          allowedModes={['text-to-image']}
          originTag={FORUM_MEDIA_TAG}
          onAssetCreated={handleAssetCreated}
        />
      )}
      
      <div className="bg-white/5 p-2 rounded-xl border border-white/10 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
            <button type="button" onClick={() => formatText('bold')} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"><Bold className="w-4 h-4" /></button>
            <button type="button" onClick={() => formatText('italic')} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"><Italic className="w-4 h-4" /></button>
            <button type="button" onClick={() => formatText('list')} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"><List className="w-4 h-4" /></button>
            <button type="button" onClick={() => formatText('link')} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"><LinkIcon className="w-4 h-4" /></button>
          </div>
          
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 mr-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 hover:bg-white/10 rounded-lg transition-all ${showEmojiPicker ? 'text-[#FF9900] bg-white/10' : 'text-white/60 hover:text-white'}`}
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Emoji Picker - Mobile Fullscreen */}
              {showEmojiPicker && (
                <>
                  {/* Mobile: Fullscreen Overlay */}
                  <div className="sm:hidden fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEmojiPicker(false)}>
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60">Emoji wählen</span>
                        <button
                          onClick={() => setShowEmojiPicker(false)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={(d) => { insertText(d.emoji); setShowEmojiPicker(false); }}
                        emojiStyle={EmojiStyle.NATIVE}
                        width="min(340px, calc(100vw - 32px))"
                        height={400}
                      />
                    </div>
                  </div>

                  {/* Desktop: Positioned Popover */}
                  <div className="hidden sm:block absolute left-0 bottom-full mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                    <EmojiPicker
                      theme={Theme.DARK}
                      onEmojiClick={(d) => { insertText(d.emoji); setShowEmojiPicker(false); }}
                      emojiStyle={EmojiStyle.NATIVE}
                      width={320}
                      height={380}
                    />
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-[#FF9900] transition-all"><ImageIcon className="w-4 h-4" /></button>
            <input type="file" ref={fileInputRef} onChange={(e) => handleUpload(e, false)} className="hidden" accept="image/*" />
            {enableImageGenerator && mediaVentureId && (
              <button
                type="button"
                onClick={handleOpenGenerator}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-[#FF9900] transition-all"
                title="AI Bild generieren"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            <VoiceInput variant="icon" onTranscript={insertText} />
          </div>

          <button 
            type="button"
            onClick={toggleVisualMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${ 
              showVisualTools ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5' 
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Design</span>
          </button>

          <div className="flex-1" />

          <button 
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${ 
              isPreview ? 'bg-[#FF9900] text-black' : 'text-white/40 hover:text-white hover:bg-white/5' 
            }`}
          >
            {isPreview ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isPreview ? 'View' : 'Raw'}</span>
          </button>
        </div>

        <AnimatePresence>
          {showVisualTools && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Hintergrund</span>
                  <button type="button" onClick={() => bgInputRef.current?.click()} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white transition-all border border-white/10">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {heroSettings.bg ? 'Ändern' : 'Bild wählen'}
                  </button>
                  {heroSettings.bg && (
                    <button type="button" onClick={() => updateMetadata({ bg: undefined })} className="text-white/40 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  )}
                  <input type="file" ref={bgInputRef} onChange={(e) => handleUpload(e, true)} className="hidden" accept="image/*" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Text</span>
                  <div className="flex gap-1">
                    {['#ffffff', '#000000', '#FF9900', '#ff0055', '#00ff99'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateMetadata({ color: c })}
                        className={`w-5 h-5 rounded-full border ${heroSettings.color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
                  {['left', 'center', 'right'].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => updateMetadata({ align: a as any })}
                      className={`p-1.5 rounded-md transition-all ${heroSettings.align === a ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                      {a === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {a === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {a === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>

                <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
                  {['sm', 'md', 'lg', 'xl'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateMetadata({ size: s as any })}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${heroSettings.size === s ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/3 transition-all min-h-[inherit]" style={{ minHeight }}>
        {showVisualTools && heroSettings.bg && (
          <div className="absolute inset-0 z-0">
            <img src={heroSettings.bg} className="w-full h-full object-cover opacity-60 blur-[2px]" />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}
        
        {isPreview ? (
          <div className={`relative z-10 p-6 h-full overflow-y-auto ${showVisualTools ? 'flex flex-col justify-center' : ''}`} style={{ minHeight, textAlign: heroSettings.align, color: heroSettings.color }}>
             <div className={`prose prose-invert max-w-none ${ 
               heroSettings.size === 'sm' ? 'prose-sm' : 
               heroSettings.size === 'lg' ? 'prose-xl' : 
               heroSettings.size === 'xl' ? 'prose-2xl' : 'prose-base' 
             }`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {value.replace(META_REGEX, '').trimEnd() || '*Vorschau...*'}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <textarea
            ref={editorRef}
            autoFocus={autoFocus}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`relative z-10 w-full h-full bg-transparent px-6 py-4 text-sm outline-none resize-none placeholder:text-white/20 ${showVisualTools ? 'font-bold shadow-black drop-shadow-md' : ''}`}
            style={{
              minHeight,
              textAlign: showVisualTools ? heroSettings.align : 'left',
              color: showVisualTools ? heroSettings.color : 'white',
              fontSize: showVisualTools && heroSettings.size === 'xl' ? '1.5rem' : 'inherit'
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {statusMessage && <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{statusMessage}</span>}
        {showCancel && onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-all">Abbrechen</button>
        )}
        <button 
          type="button"
          onClick={onSubmit} 
          disabled={isSubmitting || !value.trim()}
          className="bg-[#FF9900] text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] disabled:opacity-20 hover:brightness-110 transition-all flex items-center gap-2"
        >
          {isSubmitting ? '...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
