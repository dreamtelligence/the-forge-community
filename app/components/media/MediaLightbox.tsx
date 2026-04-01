'use client';

import { useEffect, useRef, useState, type WheelEvent, type PointerEvent } from 'react';
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface LightboxAsset {
  id?: string;
  url: string;
  type: string;
  thumbnailUrl?: string | null;
  prompt?: string | null;
  model?: string | null;
}

interface MediaLightboxProps {
  open: boolean;
  asset: LightboxAsset | null;
  onClose: () => void;
}

export function MediaLightbox({ open, asset, onClose }: MediaLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, asset?.url]);

  if (!open || !asset) return null;

  const isVideo = asset.type.toLowerCase() === 'video';
  const isImage = asset.type.toLowerCase() === 'image';
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!isImage) return;
    event.preventDefault();
    const step = event.deltaY > 0 ? -0.2 : 0.2;
    setScale((prev) => clamp(Number((prev + step).toFixed(2)), 1, 4));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isImage || scale <= 1) return;
    dragging.current = true;
    setIsDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY };
    offsetStart.current = { ...offset };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = asset.url.split('/').pop() || 'media';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(asset.url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,153,0,0.12),transparent_45%),rgba(2,4,8,0.9)] backdrop-blur-xl p-4 sm:p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Schliessen"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-6xl overflow-hidden rounded-3xl border border-white/15 bg-[#0B0F14]/95 shadow-[0_28px_96px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.03)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">
            {isVideo ? 'Video' : 'Bild'} Ansicht
          </div>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={() => setScale((prev) => clamp(prev - 0.2, 1, 4))}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setScale((prev) => clamp(prev + 0.2, 1, 4))}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white"
                  aria-label="Reset view"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white"
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white"
              aria-label="Schliessen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center bg-black p-4 sm:p-6">
          {isVideo ? (
            <video
              src={asset.url}
              poster={asset.thumbnailUrl || undefined}
              controls
              playsInline
              preload="metadata"
              className="max-h-[70vh] w-full rounded-xl bg-black"
            >
              Dein Browser unterstuetzt dieses Videoformat nicht.
            </video>
          ) : (
            <div
              className="relative flex max-h-[70vh] w-full items-center justify-center overflow-hidden"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ touchAction: 'none' }}
            >
              <img
                src={asset.url}
                alt={asset.prompt || 'Media'}
                className="max-h-[70vh] w-full select-none object-contain"
                loading="lazy"
                decoding="async"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transition: isDragging ? 'none' : 'transform 120ms ease-out',
                  cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                  userSelect: 'none',
                  ['WebkitUserDrag' as any]: 'none',
                }}
                onDoubleClick={() => {
                  if (scale === 1) setScale(2);
                  else resetView();
                }}
              />
            </div>
          )}
        </div>

        {(asset.prompt || asset.model) && (
          <div className="border-t border-white/10 px-4 py-3 text-xs text-white/50 sm:px-6">
            {asset.model && (
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Model
                </span>
                <span className="text-white/70">{asset.model}</span>
              </div>
            )}
            {asset.prompt && (
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Prompt
                </span>
                <span className="text-white/70">{asset.prompt}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
