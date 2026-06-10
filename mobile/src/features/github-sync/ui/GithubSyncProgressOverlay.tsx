import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BlockingProgressModal } from '@/shared/ui';

import {
  getGithubSyncProgressState,
  type GithubSyncProgressStage,
  subscribeGithubSyncProgress,
} from '../lib/githubSyncProgress';

function stageDescriptionKey(stage: GithubSyncProgressStage | null): string {
  switch (stage) {
    case 'uploading':
      return 'settings.githubSync.progressUploading';
    case 'committing':
      return 'settings.githubSync.progressCommitting';
    case 'preparing':
    default:
      return 'settings.githubSync.progressPreparing';
  }
}

export function GithubSyncProgressOverlay() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(getGithubSyncProgressState);

  useEffect(() => subscribeGithubSyncProgress(setProgress), []);

  const visible = progress.active && progress.showOverlay;

  return (
    <BlockingProgressModal
      visible={visible}
      title={t('settings.githubSync.progressTitle')}
      description={t(stageDescriptionKey(progress.stage))}
      total={progress.uploadTotal}
      progressLabel={
        progress.stage === 'uploading' && progress.uploadTotal > 0
          ? t('settings.githubSync.progressUploadCounter', {
              current: progress.uploadCurrent,
              total: progress.uploadTotal,
            })
          : undefined
      }
    />
  );
}
