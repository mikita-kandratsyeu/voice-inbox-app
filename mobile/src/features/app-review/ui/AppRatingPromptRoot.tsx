import React from 'react';

import { useAppReviewRecordListener } from '../model/useAppReviewRecordListener';
import { AppRatingPromptModal } from './AppRatingPromptModal';

export const AppRatingPromptRoot = () => {
  const { softPromptVisible, dismissSoftPrompt } = useAppReviewRecordListener();

  return <AppRatingPromptModal visible={softPromptVisible} onDismiss={dismissSoftPrompt} />;
};
