'use client';

/**
 * Slack Notification Toggle
 *
 * Toggle switches for Slack notification preferences.
 */

import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import { 
  Rocket, 
  Users, 
  CheckSquare, 
  ClipboardCheck, 
  MessageSquare, 
  Image, 
  Package,
  Newspaper,
  BarChart3,
} from 'lucide-react';

export interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface SlackNotificationToggleProps {
  preferences: NotificationPreference[];
  onChange: (id: string, enabled: boolean) => void;
  disabled?: boolean;
}

const defaultPreferences: NotificationPreference[] = [
  {
    id: 'ventureCreated',
    label: 'New Ventures',
    description: 'Get notified when new ventures are launched',
    icon: <Rocket className="w-4 h-4" />,
    enabled: true,
  },
  {
    id: 'squadMemberJoined',
    label: 'Squad Updates',
    description: 'Notifications about squad member joins',
    icon: <Users className="w-4 h-4" />,
    enabled: true,
  },
  {
    id: 'decisionMade',
    label: 'Decisions',
    description: 'Be informed when decisions are finalized',
    icon: <CheckSquare className="w-4 h-4" />,
    enabled: true,
  },
  {
    id: 'taskCompleted',
    label: 'Task Completion',
    description: 'Get notified when roadmap tasks are done',
    icon: <ClipboardCheck className="w-4 h-4" />,
    enabled: true,
  },
  {
    id: 'marketingGenerated',
    label: 'Marketing Content',
    description: 'Notifications for AI-generated content',
    icon: <Image className="w-4 h-4" />,
    enabled: true,
  },
  {
    id: 'supplierUpdate',
    label: 'Sourcing Updates',
    description: 'Updates on supplier samples and orders',
    icon: <Package className="w-4 h-4" />,
    enabled: true,
  },
  {
    id: 'forumActivity',
    label: 'Forum Activity',
    description: 'Popular posts and discussions',
    icon: <MessageSquare className="w-4 h-4" />,
    enabled: false,
  },
  {
    id: 'dailyDigest',
    label: 'Daily Digest',
    description: 'Daily summary of all activity',
    icon: <Newspaper className="w-4 h-4" />,
    enabled: false,
  },
  {
    id: 'weeklyReport',
    label: 'Weekly Report',
    description: 'Weekly progress and metrics',
    icon: <BarChart3 className="w-4 h-4" />,
    enabled: true,
  },
];

export function SlackNotificationToggle({
  preferences,
  onChange,
  disabled = false,
}: SlackNotificationToggleProps) {
  return (
    <div className="space-y-4">
      {preferences.map((pref) => (
        <div 
          key={pref.id}
          className="flex items-start justify-between p-3 rounded-lg border bg-card"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-muted text-muted-foreground">
              {pref.icon}
            </div>
            <div className="space-y-0.5">
              <Label 
                htmlFor={pref.id}
                className="font-medium cursor-pointer"
              >
                {pref.label}
              </Label>
              <p className="text-sm text-muted-foreground">
                {pref.description}
              </p>
            </div>
          </div>
          <Switch
            id={pref.id}
            checked={pref.enabled}
            onCheckedChange={(checked) => onChange(pref.id, checked)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

export { defaultPreferences };
