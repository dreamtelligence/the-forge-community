'use client';

import PageShell from '@/components/PageShell';
import AuthGuard from '@/components/AuthGuard';
import { useState, useEffect } from 'react';

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/announcements').then(res => res.json()).then(setUpdates);
  }, []);

  return (
    <AuthGuard>
      <PageShell>
        <header className="mb-12">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">Updates</h1>
          <p className="text-zinc-500 font-medium">Neuigkeiten aus dem Maschinenraum.</p>
        </header>

        <div className="space-y-8 max-w-3xl">
          {updates.map((update: any) => (
            <div key={update.id} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
                {new Date(update.publishedDate).toLocaleDateString()}
              </span>
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">{update.title}</h2>
              <div className="prose prose-zinc text-zinc-600">
                {update.content}
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    </AuthGuard>
  );
}