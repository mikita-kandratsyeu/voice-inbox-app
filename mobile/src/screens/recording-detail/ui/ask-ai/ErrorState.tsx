import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { RetryErrorState } from '@/shared/ui';

type ErrorStateProps = {
  color: Colors;
  onRetry: () => void;
  showPrivateModeCta?: boolean;
};

export const ErrorState = ({ color, onRetry, showPrivateModeCta = false }: ErrorStateProps) => {
  const { t } = useTranslation();

  return (
    <RetryErrorState
      color={color}
      onRetry={onRetry}
      title={t('recordingDetail.askError')}
      message={
        showPrivateModeCta
          ? t('recordingDetail.privateModeErrorHint')
          : t('recordingDetail.askErrorContinueHint')
      }
      retryLabel={t('recordingDetail.summaryRetry')}
    />
  );
};
