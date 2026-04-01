'use client';

import { Share2, LayoutTemplate, Mail, Megaphone, Calendar, Clock } from 'lucide-react';

interface PostCardProps {
  post: any;
}

export function PostCard({ post }: PostCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'instagram': return <Share2 className="w-4 h-4" />;
      case 'linkedin': return <Share2 className="w-4 h-4" />;
      case 'blog': return <LayoutTemplate className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      default: return <Megaphone className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'SCHEDULED': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'READY': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="glass-card p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/60 group-hover:text-[#FF9900] transition-colors">
            {getIcon(post.contentType)}
          </div>
          <div>
             <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{post.contentType}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(post.status)}`}>
                   {post.status}
                </span>
             </div>
             <h4 className="text-white font-medium line-clamp-1">{post.title || 'Ohne Titel'}</h4>
             <p className="text-sm text-white/40 line-clamp-2 mt-1">{post.content}</p>
          </div>
        </div>

        <div className="text-right">
           <div className="text-xs text-white/40 flex items-center justify-end gap-1">
              <Calendar className="w-3 h-3" />
              {post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString() : 'Entwurf'}
           </div>
           {post.scheduledFor && (
             <div className="text-xs text-white/40 flex items-center justify-end gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {new Date(post.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
