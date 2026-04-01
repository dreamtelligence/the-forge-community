'use client';

/**
 * Slack Settings Dialog
 *
 * Comprehensive settings for Slack integration including
 * channel selection and notification preferences.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slack, Settings, Bell, Hash, Loader2, Check } from 'lucide-react';
import { SlackConnectButton } from './slack-connect-button';
import { SlackChannelSelect } from './slack-channel-select';
import { SlackNotificationToggle, NotificationPreference, defaultPreferences } from './slack-notification-toggle';
import { defaultSlackPreferences, type SlackPreferenceKey, type SlackPreferenceMap } from '@/lib/integrations/slack/preferences';

interface SlackSettings {
  isConnected: boolean;
  workspaceName?: string;
  defaultChannelId?: string;
  defaultChannelName?: string;
  preferences: NotificationPreference[];
}

interface SlackSettingsDialogProps {
  trigger?: React.ReactNode;
  ventureId?: string;
  ventureName?: string;
}

export function SlackSettingsDialog({
  trigger,
  ventureName,
}: SlackSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<SlackSettings>({
    isConnected: false,
    preferences: defaultPreferences,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const applyPreferenceMap = (flags: SlackPreferenceMap): NotificationPreference[] =>
    defaultPreferences.map((pref) => ({
      ...pref,
      enabled: flags[pref.id as SlackPreferenceKey] ?? pref.enabled,
    }));

  const toPreferenceMap = (prefs: NotificationPreference[]): SlackPreferenceMap => {
    const map: SlackPreferenceMap = { ...defaultSlackPreferences };
    prefs.forEach((pref) => {
      if (pref.id in map) {
        map[pref.id as SlackPreferenceKey] = pref.enabled;
      }
    });
    return map;
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/slack/settings');
      if (response.ok) {
        const data = await response.json();
        const flags = (data.preferences || defaultSlackPreferences) as SlackPreferenceMap;
        setSettings({
          isConnected: data.isConnected || false,
          workspaceName: data.workspaceName,
          defaultChannelId: data.defaultChannelId,
          defaultChannelName: data.defaultChannelName,
          preferences: applyPreferenceMap(flags),
        });
      }
    } catch (error) {
      console.error('Failed to load Slack settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/integrations/slack/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultChannelId: settings.defaultChannelId,
          defaultChannelName: settings.defaultChannelName,
          preferences: toPreferenceMap(settings.preferences),
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save Slack settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (id: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      preferences: prev.preferences.map(p =>
        p.id === id ? { ...p, enabled } : p
      ),
    }));
  };

  const handleChannelChange = (channelId: string, channelName: string) => {
    setSettings(prev => ({
      ...prev,
      defaultChannelId: channelId,
      defaultChannelName: channelName,
    }));
  };

  const handleConnect = () => {
    loadSettings();
  };

  const handleDisconnect = () => {
    setSettings({
      isConnected: false,
      preferences: applyPreferenceMap(defaultSlackPreferences),
    });
  };

  const testNotification = async () => {
    if (!settings.defaultChannelId) return;

    try {
      const response = await fetch('/api/integrations/slack/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: settings.defaultChannelId,
          template: 'custom',
          data: {},
          customBlocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🔔 Test Notification',
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `This is a test notification from The Forge${ventureName ? ` for *${ventureName}*` : ''}.`,
              },
            },
          ],
          text: 'Test notification from The Forge',
        }),
      });

      if (response.ok) {
        alert('Test notification sent successfully!');
      } else {
        alert('Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      alert('Failed to send test notification');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Slack className="w-4 h-4" />
            Slack Settings
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Slack className="w-5 h-5" style={{ color: '#4A154B' }} />
            Slack Integration
          </DialogTitle>
          <DialogDescription>
            Connect your Slack workspace to receive notifications about your ventures.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="connection" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connection" className="gap-2">
                <Settings className="w-4 h-4" />
                Connection
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2" disabled={!settings.isConnected}>
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connection" className="space-y-6 mt-4">
              {/* Connection Status */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-4">Connection Status</h4>
                <SlackConnectButton
                  isConnected={settings.isConnected}
                  workspaceName={settings.workspaceName}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              </div>

              {/* Default Channel */}
              {settings.isConnected && (
                <div className="p-4 rounded-lg border bg-card space-y-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium">Default Channel</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose the default channel where notifications will be sent.
                  </p>
                  <SlackChannelSelect
                    value={settings.defaultChannelId}
                    onChange={handleChannelChange}
                    placeholder="Select default channel..."
                  />

                  {settings.defaultChannelId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testNotification}
                      className="gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Send Test Notification
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              {settings.isConnected ? (
                <>
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-1">Notification Preferences</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose which events you want to be notified about in Slack.
                    </p>
                    <SlackNotificationToggle
                      preferences={settings.preferences}
                      onChange={handlePreferenceChange}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : saveSuccess ? (
                        <Check className="w-4 h-4" />
                      ) : null}
                      {saveSuccess ? 'Saved!' : 'Save Settings'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Connect Slack first to configure notifications.
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
