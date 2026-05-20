'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BackupZipViewer } from './BackupZipViewer';

function ViewerLoadingFallback(): React.ReactElement {
  const t = useTranslations('viewerPage');
  return (
    <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {t('loadingViewer')}
    </div>
  );
}

export function BackupZipViewerShell(): React.ReactElement {
  return (
    <Suspense fallback={<ViewerLoadingFallback />}>
      <BackupZipViewer />
    </Suspense>
  );
}
