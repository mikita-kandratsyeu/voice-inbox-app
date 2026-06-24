import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { resolveAiUserFacingError } from '@/shared/lib/i18n/resolveAiUserFacingError';
import { RetryErrorState } from '@/shared/ui';

type ErrorStateProps = {
  color: Colors;
  onRetry: () => void;
  errorMessage?: string | null;
  showPrivateModeCta?: boolean;
  titleKey?: string;
  retryLabelKey?: string;
  fallbackHintKey?: string;
  actionSlot?: React.ReactNode;
};

export const ErrorState = ({
  color,
  onRetry,
  errorMessage,
  showPrivateModeCta = false,
  titleKey = 'recordingDetail.askError',
  retryLabelKey = 'recordingDetail.summaryRetry',
  fallbackHintKey,
  actionSlot,
}: ErrorStateProps) => {
  const { t } = useTranslation();
  const resolvedError = resolveAiUserFacingError(errorMessage);

  return (
    <RetryErrorState
      color={color}
      onRetry={onRetry}
      title={t(titleKey)}
      message={
        resolvedError ||
        (showPrivateModeCta
          ? t(fallbackHintKey ?? 'recordingDetail.privateModeErrorHint')
          : t(fallbackHintKey ?? 'recordingDetail.askErrorContinueHint'))
      }
      retryLabel={t(retryLabelKey)}
      actionSlot={actionSlot}
    />
  );
};
