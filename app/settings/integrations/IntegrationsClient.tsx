'use client';

/**
 * Integrations Client Component
 *
 * Interactive UI for managing integrations
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { useState } from 'react';
import Link from 'next/link';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { IntegrationConnectionDTO } from '@/lib/integrations/types';
import type { IntegrationProvider } from '@prisma/client';

interface IntegrationConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  features: Array<{
    id: string;
    name: string;
    description: string;
    available: boolean;
  }>;
  configured: boolean;
  missingEnv: string[];
}

interface IntegrationsClientProps {
  initialConnections: IntegrationConnectionDTO[];
  availableIntegrations: IntegrationConfig[];
}

export default function IntegrationsClient({
  initialConnections,
  availableIntegrations,
}: IntegrationsClientProps) {
  const [connections, setConnections] = useState(initialConnections);
  const [isConnecting, setIsConnecting] = useState<IntegrationProvider | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (provider: IntegrationProvider) => {
    setIsConnecting(provider);
    setError(null);

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          redirectUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start OAuth');
      }

      // Redirect to OAuth provider
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Bist du sicher? Diese Integration wird deaktiviert.')) {
      return;
    }

    setIsDisconnecting(connectionId);
    setError(null);

    try {
      const response = await fetch(`/api/integrations?id=${connectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect');
      }

      // Remove from local state
      setConnections(prev => prev.filter(c => c.id !== connectionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setIsDisconnecting(null);
    }
  };

  const getConnectionForProvider = (provider: IntegrationProvider) => {
    return connections.find(c => c.provider === provider);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'ERROR':
      case 'EXPIRED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-white/30" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Connected Integrations */}
      {connections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">
            Aktive Verbindungen
          </h2>
          
          {connections.map(connection => (
            <div
              key={connection.id}
              className="p-6 rounded-xl border border-white/10 bg-white/[0.02]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(connection.status)}
                  <div>
                    <h3 className="font-medium text-white">
                      {connection.workspaceName || connection.provider}
                    </h3>
                    <p className="text-sm text-white/40">
                      {connection.userEmail}
                    </p>
                    {connection.lastError && (
                      <p className="text-sm text-red-400 mt-1">
                        Error: {connection.lastError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {connection.status === 'ERROR' && (
                    <button
                      onClick={() => handleConnect(connection.provider)}
                      disabled={isConnecting === connection.provider}
                      className="p-2 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
                      title="Reconnect"
                    >
                      {isConnecting === connection.provider ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={isDisconnecting === connection.id}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-colors"
                    title="Disconnect"
                  >
                    {isDisconnecting === connection.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Integrations */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          Verfügbare Integrationen
        </h2>
        
        <div className="grid gap-4">
          {availableIntegrations.map(integration => {
            const connection = getConnectionForProvider(integration.provider);
            const isConnected = connection?.status === 'CONNECTED';
            const isConfigured = integration.configured;

            return (
              <div
                key={integration.provider}
                className={`p-6 rounded-xl border transition-all ${
                  isConnected
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-white text-lg">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-white/40 mt-1">
                      {integration.description}
                    </p>
                    {!isConfigured && (
                      <p className="text-xs text-amber-400/90 mt-2">
                        Integration ist noch nicht konfiguriert (fehlend: {integration.missingEnv.join(', ')}).
                      </p>
                    )}
                  </div>

                  {!isConnected ? (
                    <button
                      onClick={() => handleConnect(integration.provider)}
                      disabled={isConnecting === integration.provider || !isConfigured}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting === integration.provider ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !isConfigured ? (
                        'Admin Setup'
                      ) : (
                        'Verbinden'
                      )}
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                      Verbunden
                    </span>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {integration.features
                    .filter(f => f.available)
                    .map(feature => (
                      <div key={feature.id} className="flex items-center gap-2 text-sm text-white/60">
                        <CheckCircle2 className="w-4 h-4 text-green-500/50" />
                        <span>{feature.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documentation Link */}
      <div className="pt-8 border-t border-white/10">
        <Link
          href="https://github.com/dreamtelligence/the-forge-community/blob/main/docs/INTEGRATIONS.md"
          target="_blank"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Dokumentation anzeigen
        </Link>
      </div>
    </div>
  );
}
