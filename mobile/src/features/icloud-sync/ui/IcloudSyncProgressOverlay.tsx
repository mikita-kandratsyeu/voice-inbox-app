import React from 'react';
import { useTranslation } from 'react-i18next';

import { BlockingProgressModal } from '@/shared/ui';

import {
  getIcloudSyncProgressState,
  type IcloudSyncProgressStage,
  subscribeIcloudSyncProgress,
} from '../lib/icloudSyncProgress';

function stageDescriptionKey(stage: IcloudSyncProgressStage | null): string {
  switch (stage) {
    case 'uploading':
      return 'settings.icloudSync.progressUploading';
    case 'finishing':
      return 'settings.icloudSync.progressFinishing';
    case 'preparing':
    default:
      return 'settings.icloudSync.progressPreparing';
  }
}

export function IcloudSyncProgressOverlay() {
  const { t } = useTranslation();
  const [progress, setProgress] = React.useState(getIcloudSyncProgressState);

  React.useEffect(() => subscribeIcloudSyncProgress(setProgress), []);

  const visible = progress.active && progress.showOverlay;

  return (
    <BlockingProgressModal
      visible={visible}
      title={t('settings.icloudSync.progressTitle')}
      description={t(stageDescriptionKey(progress.stage))}
      total={progress.uploadTotal}
      progressLabel={
        progress.stage === 'uploading' && progress.uploadTotal > 0
          ? t('settings.icloudSync.progressUploadCounter', {
              current: progress.uploadCurrent,
              total: progress.uploadTotal,
            })
          : undefined
      }
    />
  );
}
