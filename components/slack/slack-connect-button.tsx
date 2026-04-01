'use client';

/**
 * Slack Connect Button
 *
 * Connects The Forge to a Slack workspace via OAuth.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Slack,
  Check,
} from 'lucide-react';

interface SlackConnectButtonProps {
  isConnected?: boolean;
  workspaceName?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SlackConnectButton({
  isConnected = false,
  workspaceName,
  onConnect,
  onDisconnect,
  variant = 'default',
  size = 'default',
  className = '',
}: SlackConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Open OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        '/api/integrations/slack/auth',
        'Slack OAuth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (popup) {
        // Listen for OAuth completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setIsLoading(false);
            onConnect?.();
          }
        }, 500);
      } else {
        // Fallback: redirect
        window.location.href = '/api/integrations/slack/auth';
      }
    } catch (error) {
      console.error('Slack connect error:', error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Slack workspace? You will stop receiving notifications.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/slack/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        onDisconnect?.();
      } else {
        console.error('Failed to disconnect Slack');
      }
    } catch (error) {
      console.error('Slack disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm">
          <Check className="w-4 h-4" />
          <span>Connected{workspaceName ? ` to ${workspaceName}` : ''}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={isLoading}
          className="text-muted-foreground hover:text-destructive"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Disconnect'
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleConnect}
      disabled={isLoading}
      className={`gap-2 ${className}`}
      style={{
        backgroundColor: variant === 'default' ? '#4A154B' : undefined,
        borderColor: variant === 'outline' ? '#4A154B' : undefined,
        color: variant === 'default' ? 'white' : undefined,
      }}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Slack className="w-4 h-4" />
      )}
      Connect Slack
    </Button>
  );
}
