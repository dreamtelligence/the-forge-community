'use client';

/**
 * Slack Channel Select
 *
 * Dropdown to select a Slack channel for notifications.
 */

import { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Hash, 
  Lock,
  AlertCircle,
} from 'lucide-react';
import type { SlackChannel } from '@/lib/integrations/slack/service';

interface SlackChannelSelectProps {
  value?: string;
  onChange: (channelId: string, channelName: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SlackChannelSelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select a channel...',
}: SlackChannelSelectProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/slack/channels');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load channels');
      }

      const data = await response.json();
      setChannels(data.channels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      onChange(channelId, channel.name);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading channels...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-destructive/50 rounded-md text-destructive">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || channels.length === 0}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {channels.length === 0 ? (
          <SelectItem value="none" disabled>
            No channels available
          </SelectItem>
        ) : (
          channels.map((channel) => (
            <SelectItem key={channel.id} value={channel.id}>
              <div className="flex items-center gap-2">
                {channel.is_private ? (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span>{channel.name}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({channel.num_members} members)
                </span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
