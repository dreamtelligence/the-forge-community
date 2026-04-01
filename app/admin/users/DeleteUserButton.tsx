'use client';

import { useState } from 'react';
import { Trash2, Loader2, AlertCircle } from 'lucide-react';

interface DeleteUserButtonProps {
  userId: string;
  userEmail: string;
  isDeleted: boolean;
}

export function DeleteUserButton({ userId, userEmail, isDeleted }: DeleteUserButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }

      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (isDeleted) {
    return (
      <span className="text-xs text-white/40">Deleted</span>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition"
        title="Account löschen"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl border border-white/10 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-instrument-serif text-white">
                  Account löschen?
                </h3>
                <p className="text-sm text-white/40">Diese Aktion kann nicht rückgängig gemacht werden</p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-sm text-white/60 mb-1">Account:</div>
              <div className="font-medium text-white">{userEmail}</div>
              <div className="text-xs text-white/40 mt-2">
                ID: {userId}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Lösche...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
