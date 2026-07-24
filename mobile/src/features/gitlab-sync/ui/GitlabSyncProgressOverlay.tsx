import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BlockingProgressModal } from '@/shared/ui';

import {
  getGitlabSyncProgressState,
  type GitlabSyncProgressStage,
  subscribeGitlabSyncProgress,
} from '../lib/gitlabSyncProgress';

function stageDescriptionKey(stage: GitlabSyncProgressStage | null): string {
  switch (stage) {
    case 'uploading':
      return 'settings.gitlabSync.progressUploading';
    case 'committing':
      return 'settings.gitlabSync.progressCommitting';
    case 'preparing':
    default:
      return 'settings.gitlabSync.progressPreparing';
  }
}

export function GitlabSyncProgressOverlay() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(getGitlabSyncProgressState);

  useEffect(() => subscribeGitlabSyncProgress(setProgress), []);

  const visible = progress.active && progress.showOverlay;

  return (
    <BlockingProgressModal
      visible={visible}
      title={t('settings.gitlabSync.progressTitle')}
      description={t(stageDescriptionKey(progress.stage))}
      total={progress.uploadTotal}
      progressLabel={
        progress.stage === 'uploading' && progress.uploadTotal > 0
          ? t('settings.gitlabSync.progressUploadCounter', {
              current: progress.uploadCurrent,
              total: progress.uploadTotal,
            })
          : undefined
      }
    />
  );
}
