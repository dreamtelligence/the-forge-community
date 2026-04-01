'use client';

/**
 * API Keys Client Component
 *
 * Handles client-side state and interactions:
 * - Create key modal
 * - Display keys list
 * - Revoke keys
 * - View statistics
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { useState } from 'react';
import type { ApiKeyListItem } from '@/lib/api-keys/types';
import CreateApiKeyModal from './components/CreateApiKeyModal';
import ApiKeyCard from './components/ApiKeyCard';
import ShowApiKeyModal from './components/ShowApiKeyModal';
import { Plus, AlertCircle } from 'lucide-react';

interface ApiKeysClientProps {
  initialKeys: ApiKeyListItem[];
  ventures: { id: string; name: string }[];
}

export default function ApiKeysClient({ initialKeys, ventures }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<ApiKeyListItem[]>(initialKeys);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<{
    open: boolean;
    apiKey: string;
    name: string;
  }>({
    open: false,
    apiKey: '',
    name: '',
  });

  /**
   * Handle key creation success
   */
  const handleKeyCreated = (newKey: ApiKeyListItem, plaintextKey: string) => {
    setKeys([newKey, ...keys]);
    setIsCreateModalOpen(false);

    // Show the plaintext key ONCE
    setShowApiKeyModal({
      open: true,
      apiKey: plaintextKey,
      name: newKey.name,
    });
  };

  /**
   * Handle key revocation
   */
  const handleKeyRevoked = async (keyId: string) => {
    setKeys(keys.filter((k) => k.id !== keyId));
  };


  const maxKeysReached = keys.length >= 50;

  return (
    <>
      {/* Create Button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Your API Keys</h2>
          <p className="text-sm text-zinc-400">
            {keys.length === 0
              ? 'No API keys yet. Create one to get started.'
              : `${keys.length} ${keys.length === 1 ? 'key' : 'keys'} created`}
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={maxKeysReached}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9900] hover:bg-[#FF9900] disabled:bg-zinc-700 disabled:cursor-not-allowed text-black rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Max Keys Warning */}
      {maxKeysReached && (
        <div className="mb-6 bg-yellow-950/20 border border-yellow-900/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-yellow-500 font-semibold mb-1">
              Maximum keys reached
            </h3>
            <p className="text-yellow-200/70 text-sm">
              You've created the maximum of 50 API keys. Revoke unused keys to create new ones.
            </p>
          </div>
        </div>
      )}

      {/* Keys List */}
      {keys.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">No API keys yet</h3>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Create your first API key to start integrating The Forge with external tools like
            Zapier, Make, or custom applications.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9900] hover:bg-[#FF9900] text-black rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First API Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onRevoke={async (id) => {
                const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
                if (res.ok) handleKeyRevoked(id);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateApiKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleKeyCreated}
        ventures={ventures}
      />

      {showApiKeyModal.open && (
        <ShowApiKeyModal
          onClose={() =>
            setShowApiKeyModal({ open: false, apiKey: '', name: '' })
          }
          apiKey={showApiKeyModal.apiKey}
          keyName={showApiKeyModal.name}
        />
      )}
    </>
  );
}
