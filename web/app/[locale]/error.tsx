'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { HttpErrorScreen } from '@/components/errors/HttpErrorScreen';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleError({ error, reset }: Props) {
  const t = useTranslations('httpErrors.runtime');
  const tErrors = useTranslations('httpErrors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <HttpErrorScreen
      code="500"
      badge={t('badge')}
      title={t('title')}
      description={t('description')}
      homeLabel={tErrors('backHome')}
      actions={
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-lg border border-black/10 bg-black/5 px-6 text-sm font-medium text-black transition-opacity hover:opacity-90 dark:border-white/10 dark:bg-white/5 dark:text-white sm:w-auto"
        >
          {t('retry')}
        </button>
      }
    />
  );
}
