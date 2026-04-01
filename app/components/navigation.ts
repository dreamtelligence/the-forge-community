import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  MessageCircle,
  Users,
  CheckSquare,
  PieChart,
  BookOpen,
  Rocket,
  Image as ImageIcon,
  Sparkles,
  Clapperboard,
} from 'lucide-react';

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  status?: 'WIP';
};

export const navigation: NavItem[] = [
  { name: 'Studio', href: '/studio', icon: Clapperboard },
  { name: 'Media', href: '/media', icon: ImageIcon },
  { name: 'Ventures', href: '/ventures', icon: Rocket },
  { name: 'AI Kommunikation', href: '/communication', icon: Sparkles },
  { name: 'Forum', href: '/forum', icon: MessageSquare },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Squad Markt', href: '/squads', icon: Users },
  { name: 'Mission Control', href: '/tasks', icon: CheckSquare, status: 'WIP' },
  { name: 'Finanzen', href: '/transparency', icon: PieChart, status: 'WIP' },
  { name: 'Academy', href: '/resources', icon: BookOpen, status: 'WIP' },
];
