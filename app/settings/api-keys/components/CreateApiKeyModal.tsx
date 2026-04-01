'use client';

/**
 * Create API Key Modal
 *
 * Professional form for creating new API keys with:
 * - Name input
 * - Venture selector (optional)
 * - Scope selector (checkboxes grouped by category)
 * - Rate limit customization
 * - Expiration date picker
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { ApiKeyListItem, ApiScope } from '@/lib/api-keys/types';

/**
 * Available scopes grouped by category
 */
const SCOPE_CATEGORIES = [
  {
    name: 'Media Generation',
    scopes: [
      { value: 'media:generate:image' as ApiScope, label: 'Generate Images', description: 'Create AI-generated images' },
      { value: 'media:generate:video' as ApiScope, label: 'Generate Videos', description: 'Create AI-generated videos' },
      { value: 'media:generate:voice' as ApiScope, label: 'Generate Voice', description: 'Create AI voice audio' },
      { value: 'media:read' as ApiScope, label: 'Read Media', description: 'Access media assets' },
      { value: 'media:delete' as ApiScope, label: 'Delete Media', description: 'Remove media assets' },
    ],
  },
  {
    name: 'Content Generation',
    scopes: [
      { value: 'content:generate:marketing' as ApiScope, label: 'Generate Marketing', description: 'Create marketing content' },
      { value: 'content:generate:legal' as ApiScope, label: 'Generate Legal', description: 'Create legal documents' },
      { value: 'content:read' as ApiScope, label: 'Read Content', description: 'Access content' },
      { value: 'content:delete' as ApiScope, label: 'Delete Content', description: 'Remove content' },
    ],
  },
  {
    name: 'Venture Management',
    scopes: [
      { value: 'venture:read' as ApiScope, label: 'Read Ventures', description: 'Access venture data' },
      { value: 'venture:write' as ApiScope, label: 'Write Ventures', description: 'Create/update ventures' },
      { value: 'venture:delete' as ApiScope, label: 'Delete Ventures', description: 'Remove ventures' },
    ],
  },
  {
    name: 'Brand DNA',
    scopes: [
      { value: 'brand:read' as ApiScope, label: 'Read Brand DNA', description: 'Access brand identity' },
      { value: 'brand:write' as ApiScope, label: 'Write Brand DNA', description: 'Update brand identity' },
    ],
  },
  {
    name: 'Files',
    scopes: [
      { value: 'files:upload' as ApiScope, label: 'Upload Files', description: 'Upload files to storage' },
      { value: 'files:read' as ApiScope, label: 'Read Files', description: 'Access files' },
      { value: 'files:delete' as ApiScope, label: 'Delete Files', description: 'Remove files' },
    ],
  },
];

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newKey: ApiKeyListItem, plaintextKey: string) => void;
  ventures: { id: string; name: string }[];
}

export default function CreateApiKeyModal({
  isOpen,
  onClose,
  onSuccess,
  ventures,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [ventureId, setVentureId] = useState('');
  const [scopes, setScopes] = useState<ApiScope[]>([]);
  const [rateLimit, setRateLimit] = useState(100);
  const [rateLimitDaily, setRateLimitDaily] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Toggle scope selection
   */
  const toggleScope = (scope: ApiScope) => {
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  /**
   * Select all scopes in a category
   */
  const selectCategory = (categoryScopes: ApiScope[]) => {
    const allSelected = categoryScopes.every((s) => scopes.includes(s));
    if (allSelected) {
      // Deselect all
      setScopes(scopes.filter((s) => !categoryScopes.includes(s)));
    } else {
      // Select all
      const newScopes = [...scopes];
      categoryScopes.forEach((s) => {
        if (!newScopes.includes(s)) {
          newScopes.push(s);
        }
      });
      setScopes(newScopes);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name for your API key');
      return;
    }

    if (scopes.length === 0) {
      setError('Please select at least one scope');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ventureId: ventureId || undefined,
          scopes,
          rateLimit,
          rateLimitDaily,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }

      const data = await res.json();

      // Reset form
      setName('');
      setVentureId('');
      setScopes([]);
      setRateLimit(100);
      setRateLimitDaily(1000);
      setShowAdvanced(false);

      // Notify parent (will show plaintext key modal)
      onSuccess(
        {
          id: data.keyId,
          name: data.name,
          keyPrefix: data.keyPrefix,
          scopes: data.scopes,
          ventureId: ventureId || undefined,
          rateLimit,
          rateLimitDaily,
          isActive: true,
          createdAt: data.createdAt,
        },
        data.apiKey // Plaintext key
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-3xl w-full my-8">
        {/* Header - Fixed */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-white">Create API Key</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Generate a new API key for external integrations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Scrollable Content */}
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-500 font-semibold mb-1">Error</h3>
                <p className="text-red-200/70 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Key Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Zapier Integration, Production Bot"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              maxLength={100}
            />
            <p className="text-xs text-zinc-500 mt-1">
              A descriptive name to identify this key
            </p>
          </div>

          {/* Venture (Optional) */}
          {ventures.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Venture (Optional)
              </label>
              <select
                value={ventureId}
                onChange={(e) => setVentureId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="">All Ventures (Global Access)</option>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Scope this key to a specific venture or leave blank for global access
              </p>
            </div>
          )}

          {/* Scopes */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Permissions <span className="text-red-500">*</span>
            </label>
            <div className="space-y-4">
              {SCOPE_CATEGORIES.map((category) => {
                const categoryScopes = category.scopes.map((s) => s.value);
                const allSelected = categoryScopes.every((s) => scopes.includes(s));

                return (
                  <div key={category.name} className="bg-zinc-800/50 rounded-lg p-4">
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{category.name}</h3>
                      <button
                        type="button"
                        onClick={() => selectCategory(categoryScopes)}
                        className="text-xs text-zinc-400 hover:text-white font-medium"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Scopes */}
                    <div className="space-y-2">
                      {category.scopes.map((scope) => (
                        <label
                          key={scope.value}
                          className="flex items-start gap-3 cursor-pointer hover:bg-zinc-800 p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={scopes.includes(scope.value)}
                            onChange={() => toggleScope(scope.value)}
                            className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-2 focus:ring-zinc-600 focus:ring-offset-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">{scope.label}</div>
                            <div className="text-xs text-zinc-400">{scope.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Selected: {scopes.length} {scopes.length === 1 ? 'permission' : 'permissions'}
            </p>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 bg-zinc-800/30 rounded-lg p-4">
                {/* Rate Limit */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Hourly Rate Limit
                  </label>
                  <input
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(parseInt(e.target.value) || 100)}
                    min={10}
                    max={10000}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Maximum requests per hour (10-10,000)
                  </p>
                </div>

                {/* Daily Rate Limit */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Daily Rate Limit
                  </label>
                  <input
                    type="number"
                    value={rateLimitDaily}
                    onChange={(e) => setRateLimitDaily(parseInt(e.target.value) || 1000)}
                    min={100}
                    max={100000}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Maximum requests per day (100-100,000)
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Actions - Fixed Footer */}
          <div className="bg-zinc-900 border-t border-zinc-800 p-6 flex items-center justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || scopes.length === 0 || !name.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#FF9900] hover:bg-[#FF9900] disabled:bg-zinc-700 disabled:cursor-not-allowed text-black rounded-lg font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create API Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
