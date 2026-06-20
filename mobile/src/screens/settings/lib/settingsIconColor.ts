import type { Colors } from '@/shared/config';

/** Same id → same color everywhere in Settings. */
export type SettingsIconId =
  | 'alertTriangle'
  | 'barChart2'
  | 'archive'
  | 'bell'
  | 'bot'
  | 'box'
  | 'bug'
  | 'calendarClock'
  | 'clipboardList'
  | 'cloudCheck'
  | 'command'
  | 'cpu'
  | 'download'
  | 'fingerprint'
  | 'github'
  | 'gitlab'
  | 'icloud'
  | 'hand'
  | 'hardDrive'
  | 'info'
  | 'languages'
  | 'layers'
  | 'lockKeyhole'
  | 'mic'
  | 'moon'
  | 'newspaper'
  | 'refreshCw'
  | 'rotateCcw'
  | 'scanFace'
  | 'server'
  | 'settings2'
  | 'shield'
  | 'star'
  | 'fileText'
  | 'trash2'
  | 'uploadCloud'
  | 'zap';

const SETTINGS_ICON_COLOR: Record<SettingsIconId, (color: Colors) => string> = {
  barChart2: (c) => c.accent.primary,
  archive: (c) => c.accent.archive,
  bell: (c) => c.accent.unpin,
  bot: (c) => c.accent.aiData,
  box: (c) => c.accent.models,
  bug: (c) => c.status.error.text,
  calendarClock: (c) => c.accent.cache,
  clipboardList: (c) => c.accent.aiData,
  cloudCheck: (c) => c.accent.success,
  command: (c) => c.accent.primary,
  cpu: (c) => c.accent.models,
  download: (c) => c.accent.success,
  fingerprint: (c) => c.onboarding.lock.color,
  github: (c) => c.accent.primary,
  gitlab: (c) => c.accent.transcript,
  icloud: (c) => c.accent.primary,
  hand: (c) => c.accent.models,
  hardDrive: (c) => c.accent.success,
  info: (c) => c.accent.archive,
  languages: (c) => c.accent.transcript,
  layers: (c) => c.accent.models,
  lockKeyhole: (c) => c.onboarding.lock.color,
  mic: (c) => c.accent.transcript,
  moon: (c) => c.accent.primary,
  newspaper: (c) => c.accent.archive,
  refreshCw: (c) => c.accent.success,
  rotateCcw: (c) => c.accent.cache,
  scanFace: (c) => c.accent.success,
  server: (c) => c.accent.models,
  settings2: (c) => c.accent.cache,
  shield: (c) => c.onboarding.shield.color,
  star: (c) => c.accent.unpin,
  fileText: (c) => c.accent.primary,
  trash2: (c) => c.accent.delete,
  uploadCloud: (c) => c.accent.models,
  zap: (c) => c.accent.unpin,
  alertTriangle: (c) => c.status.error.text,
};

export function getSettingsIconColor(color: Colors, icon: SettingsIconId): string {
  return SETTINGS_ICON_COLOR[icon](color);
}
