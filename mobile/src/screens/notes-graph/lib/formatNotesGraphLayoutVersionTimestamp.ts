import dayjs from 'dayjs';

import { resolveDayjsLocale } from '@/shared/lib/date';

export function formatNotesGraphLayoutVersionDate(iso: string, language: string): string {
  const loc = resolveDayjsLocale(language);
  return dayjs(iso).locale(loc).format('D MMM YYYY');
}

export function formatNotesGraphLayoutVersionTimestamp(iso: string, language: string): string {
  const loc = resolveDayjsLocale(language);
  return `${formatNotesGraphLayoutVersionDate(iso, language)}, ${dayjs(iso).locale(loc).format('HH:mm')}`;
}
