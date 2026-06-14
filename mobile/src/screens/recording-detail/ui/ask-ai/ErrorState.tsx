import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { RetryErrorState } from '@/shared/ui';

type ErrorStateProps = {
  color: Colors;
  onRetry: () => void;
  errorMessage?: string | null;
  showPrivateModeCta?: boolean;
};

export const ErrorState = ({
  color,
  onRetry,
  errorMessage,
  showPrivateModeCta = false,
}: ErrorStateProps) => {
  const { t } = useTranslation();
  const trimmedError = errorMessage?.trim();

  return (
    <RetryErrorState
      color={color}
      onRetry={onRetry}
      title={t('recordingDetail.askError')}
      message={
        trimmedError ||
        (showPrivateModeCta
          ? t('recordingDetail.privateModeErrorHint')
          : t('recordingDetail.askErrorContinueHint'))
      }
      retryLabel={t('recordingDetail.summaryRetry')}
    />
  );
};
