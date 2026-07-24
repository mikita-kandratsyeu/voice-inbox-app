import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

import { resolveDayjsLocale } from '@/shared/lib/date';

import type { NotesGraphLayoutVersionEntry } from './notesGraphLayoutDb';

type LayoutVersionSubtitleSource = Pick<
  NotesGraphLayoutVersionEntry,
  'name' | 'versionNumber' | 'createdAt'
>;

function getNotesGraphLayoutHeaderLabel(
  version: LayoutVersionSubtitleSource,
  t: TFunction,
): string {
  const trimmed = version.name?.trim();
  if (!trimmed) {
    return t('notesGraph.history.versionLabel', { version: version.versionNumber });
  }

  const autoName = t('notesGraph.saveLayoutSheet.autoName');
  if (trimmed === autoName || trimmed.startsWith(`${autoName} ·`)) {
    return autoName;
  }

  return trimmed;
}

export function formatGraphAppliedLayoutHeaderSubtitle(
  version: LayoutVersionSubtitleSource,
  language: string,
  t: TFunction,
): string {
  const loc = resolveDayjsLocale(language);
  const label = getNotesGraphLayoutHeaderLabel(version, t);
  const savedOn = dayjs(version.createdAt).locale(loc).format('D MMM YYYY');
  return `${label} · ${savedOn}`;
}
