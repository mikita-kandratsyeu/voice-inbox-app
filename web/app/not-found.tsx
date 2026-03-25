import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { HttpErrorScreen } from '@/components/errors/HttpErrorScreen';

export default async function NotFound(): Promise<ReactElement> {
  const t = await getTranslations('httpErrors');

  return (
    <HttpErrorScreen
      code="404"
      badge={t('404.badge')}
      title={t('404.title')}
      description={t('404.description')}
      homeLabel={t('backHome')}
    />
  );
}
