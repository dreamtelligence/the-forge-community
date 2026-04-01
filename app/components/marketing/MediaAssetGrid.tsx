'use client';

import { useState } from 'react';
import type { MediaAsset } from '@prisma/client';
import { Play, Image as ImageIcon, CheckCircle2, Trash2, Download, Mic2, Share2, Star } from 'lucide-react';
import { VideoPreview } from '@/app/components/media/VideoPreview';
import { MediaLightbox } from '@/app/components/media/MediaLightbox';

interface MediaAssetGridProps {
  assets: MediaAsset[];
  onSelect?: (asset: MediaAsset) => void;
  selectedIds?: string[];
  onDelete?: (id: string) => void;
  onTogglePublic?: (id: string, nextPublic: boolean) => void;
  onToggleFavorite?: (id: string, nextFavorite: boolean) => void;
  className?: string;
  enableLightbox?: boolean;
}

export function MediaAssetGrid({ 
  assets, 
  onSelect, 
  selectedIds = [], 
  onDelete,
  onTogglePublic,
  onToggleFavorite,
  className = '',
  enableLightbox = true,
}: MediaAssetGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lightboxAsset, setLightboxAsset] = useState<MediaAsset | null>(null);

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-white/30 border border-white/5 rounded-xl bg-white/[0.02]">
        <ImageIcon className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm font-medium">Keine Medien gefunden.</p>
      </div>
    );
  }

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank'); // Fallback
    }
  };

  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {assets.map((asset) => {
          const isSelected = selectedIds.includes(asset.id);
          const isVideo = asset.type.toLowerCase() === 'video';
          const isAudio = asset.type.toLowerCase() === 'audio';
          const canOpenLightbox = enableLightbox && !onSelect && !isAudio;
          const openLightbox = canOpenLightbox ? () => setLightboxAsset(asset) : undefined;
          const defaultFilename = isVideo ? 'video.mp4' : isAudio ? 'audio.mp3' : 'image.jpg';
          const canTogglePublic = typeof asset.isPublic === 'boolean' && Boolean(onTogglePublic) && !isAudio;
          const canToggleFavorite = typeof asset.isFavorite === 'boolean' && Boolean(onToggleFavorite);

          return (
            <div
              key={asset.id}
              className={`group relative aspect-square rounded-xl overflow-hidden border transition-all ${
                isSelected 
                  ? 'border-[#FF9900] ring-1 ring-[#FF9900]' 
                  : 'border-white/10 hover:border-white/30'
              } ${canOpenLightbox || onSelect ? 'cursor-pointer' : 'cursor-default'}`}
              onMouseEnter={() => setHoveredId(asset.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                if (onSelect) {
                  onSelect(asset);
                  return;
                }
                if (openLightbox) {
                  openLightbox();
                }
              }}
            >
              {/* Thumbnail / Content */}
              {isVideo ? (
                <VideoPreview
                  src={asset.url}
                  poster={asset.thumbnailUrl}
                  className="h-full w-full"
                  mediaClassName="h-full w-full object-cover"
                  enableHover={false}
                  allowClick={false}
                  showOverlay={Boolean(openLightbox)}
                  stopClickPropagation={true}
                  openOnClick={Boolean(openLightbox)}
                  onOpen={openLightbox}
                  loop={false}
                />
              ) : isAudio ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-black/40">
                  <div className="flex flex-col items-center gap-2 text-white/70">
                    <Mic2 className="w-6 h-6" />
                    <span className="text-xs font-semibold">Voiceover</span>
                  </div>
                  <audio controls src={asset.url} className="w-[90%] h-8" />
                </div>
              ) : (
                <img
                  src={asset.url}
                  alt="Asset"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}

              {/* Type Indicator */}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                {isVideo ? <Play className="w-3 h-3" /> : isAudio ? <Mic2 className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                {asset.source === 'EDITED' && <span className="text-[#FF9900] ml-1">Edited</span>}
              </div>

              {/* Selection Check */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-[#FF9900] rounded-full flex items-center justify-center text-black">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}

              {/* Hover Actions */}
              <div className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent transition-opacity flex justify-between items-end ${
                hoveredId === asset.id ? 'opacity-100' : 'opacity-0'
              }`}>
                <button 
                  onClick={(e) => handleDownload(e, asset.url, asset.filename || defaultFilename)}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  {canToggleFavorite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite?.(asset.id, !asset.isFavorite);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        asset.isFavorite
                          ? 'text-[#FF9900] hover:bg-[#FF9900]/15'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title={asset.isFavorite ? 'Gepinnt' : 'Pin'}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {canTogglePublic && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePublic?.(asset.id, !asset.isPublic);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        asset.isPublic
                          ? 'text-[#FF9900] hover:bg-[#FF9900]/15'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title={asset.isPublic ? 'Öffentlich' : 'Privat'}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm('Wirklich löschen?')) onDelete(asset.id);
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-white/70 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <MediaLightbox
        open={Boolean(lightboxAsset)}
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
      />
    </>
  );
}
