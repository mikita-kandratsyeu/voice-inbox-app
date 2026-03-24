import {
  Briefcase,
  Flame,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  Plane,
  Rocket,
  Star,
} from 'lucide-react-native';
import React from 'react';

export type FolderIconKey =
  | 'briefcase'
  | 'home'
  | 'lightbulb'
  | 'music'
  | 'star'
  | 'heart'
  | 'plane'
  | 'rocket'
  | 'palette'
  | 'flame'
  | 'globe'
  | 'graduation';

export const FOLDER_ICON_KEYS: FolderIconKey[] = [
  'briefcase',
  'home',
  'lightbulb',
  'music',
  'star',
  'heart',
  'plane',
  'rocket',
  'palette',
  'flame',
  'globe',
  'graduation',
];

export const DEFAULT_FOLDER_ICON_KEY: FolderIconKey = 'briefcase';

export const folderIconComponents: Record<
  FolderIconKey,
  React.FC<{ size: number; color: string; strokeWidth: number }>
> = {
  briefcase: Briefcase,
  home: Home,
  lightbulb: Lightbulb,
  music: Music,
  star: Star,
  heart: Heart,
  plane: Plane,
  rocket: Rocket,
  palette: Palette,
  flame: Flame,
  globe: Globe,
  graduation: GraduationCap,
};

export function parseFolderIconKey(icon: string): FolderIconKey {
  return FOLDER_ICON_KEYS.includes(icon as FolderIconKey)
    ? (icon as FolderIconKey)
    : DEFAULT_FOLDER_ICON_KEY;
}

type FolderLucideIconProps = {
  iconId: string;
  size?: number;
  color: string;
  strokeWidth?: number;
};

export function FolderLucideIcon({
  iconId,
  size = 14,
  color,
  strokeWidth = 2,
}: FolderLucideIconProps) {
  const key = parseFolderIconKey(iconId);
  const Icon = folderIconComponents[key];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
