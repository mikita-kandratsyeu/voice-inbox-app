import type { LucideIcon } from 'lucide-react-native';
import { Bookmark, ListChecks, Quote, Star } from 'lucide-react-native';

import type { AccentColorId, ColorScheme } from '@/shared/config';
import { getAccentPreviewHex } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import type { RecordingMarkKind } from '../model/types';

export type RecordingMarkKindUiConfig = {
  Icon: LucideIcon;
  /** Same accent ids as folder color picker (`appearance.accentColor`). */
  accentColorId: AccentColorId;
  /** i18n key under `record.markKind.*` for quick-add accessibility */
  recordA11yKey:
    | 'record.markKind.important'
    | 'record.markKind.task'
    | 'record.markKind.quote'
    | 'record.markKind.moment';
  /** i18n key under `recordingDetail.markUntitled.*` */
  untitledKey:
    | 'recordingDetail.markUntitled.important'
    | 'recordingDetail.markUntitled.task'
    | 'recordingDetail.markUntitled.quote'
    | 'recordingDetail.markUntitled.moment';
  sharePrefix: string;
};

export const RECORDING_MARK_KIND_UI: Record<RecordingMarkKind, RecordingMarkKindUiConfig> = {
  moment: {
    Icon: Bookmark,
    accentColorId: 'default',
    recordA11yKey: 'record.markKind.moment',
    untitledKey: 'recordingDetail.markUntitled.moment',
    sharePrefix: '📌',
  },
  important: {
    Icon: Star,
    accentColorId: 'amber',
    recordA11yKey: 'record.markKind.important',
    untitledKey: 'recordingDetail.markUntitled.important',
    sharePrefix: '⭐',
  },
  task: {
    Icon: ListChecks,
    accentColorId: 'emerald',
    recordA11yKey: 'record.markKind.task',
    untitledKey: 'recordingDetail.markUntitled.task',
    sharePrefix: '☑️',
  },
  quote: {
    Icon: Quote,
    accentColorId: 'violet',
    recordA11yKey: 'record.markKind.quote',
    untitledKey: 'recordingDetail.markUntitled.quote',
    sharePrefix: '❝',
  },
};

export function getRecordingMarkKindUi(kind: RecordingMarkKind): RecordingMarkKindUiConfig {
  return RECORDING_MARK_KIND_UI[kind] ?? RECORDING_MARK_KIND_UI.moment;
}

/** Picker order: default kind (`moment`) is always first. */
export const RECORDING_MARK_PICKER_KINDS: RecordingMarkKind[] = [
  'moment',
  'important',
  'task',
  'quote',
];

export type RecordingMarkKindAccentColors = {
  accent: string;
  backgroundUnselected: string;
  borderUnselected: string;
};

/** Folder-chip styling: same accent swatches and alpha rules as `FolderChipBar`. */
export function getRecordingMarkKindAccentColors(
  kind: RecordingMarkKind,
  scheme: ColorScheme,
  surfaceDark: boolean,
): RecordingMarkKindAccentColors {
  const { accentColorId } = getRecordingMarkKindUi(kind);
  const accent = getAccentPreviewHex(accentColorId, scheme);
  const inactiveTint = surfaceDark ? 0.22 : 0.14;
  const inactiveBorder = surfaceDark ? 0.5 : 0.42;
  return {
    accent,
    backgroundUnselected: withAlphaHex(accent, inactiveTint),
    borderUnselected: withAlphaHex(accent, inactiveBorder),
  };
}
