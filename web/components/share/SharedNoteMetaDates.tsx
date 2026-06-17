'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import {
  formatAbsoluteDateTime,
  formatHumanFutureDateTime,
  formatHumanPastDateTime,
  type HumanDateTimeLabels,
} from '@/lib/format-human-datetime';

type SharedNoteMetaDatesProps = {
  publishedAt: string;
  expiresAt?: string | null;
};

export function SharedNoteMetaDates({ publishedAt, expiresAt }: SharedNoteMetaDatesProps) {
  const locale = useLocale();
  const t = useTranslations('sharedNote');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const labels = useMemo<HumanDateTimeLabels>(
    () => ({
      justNow: t('justNow'),
      todayAt: t('todayAt'),
      yesterdayAt: t('yesterdayAt'),
      tomorrowAt: t('tomorrowAt'),
      expired: t('expired'),
    }),
    [t],
  );

  if (!now) {
    return null;
  }

  const publishedDate = new Date(publishedAt);
  const publishedLabel = formatHumanPastDateTime(publishedDate, now, locale, labels);
  const publishedAbsolute = formatAbsoluteDateTime(publishedDate, locale);

  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const expiresLabel = expiresDate
    ? formatHumanFutureDateTime(expiresDate, now, locale, labels)
    : null;
  const expiresAbsolute = expiresDate ? formatAbsoluteDateTime(expiresDate, locale) : null;

  return (
    <div className="mt-4 flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
      <time dateTime={publishedAt} title={publishedAbsolute}>
        {t('publishedOn', { date: publishedLabel })}
      </time>
      {expiresLabel && expiresAt ? (
        <time dateTime={expiresAt} title={expiresAbsolute ?? undefined}>
          {t('expiresOn', { date: expiresLabel })}
        </time>
      ) : null}
    </div>
  );
}
