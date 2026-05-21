import { FileText, ListChecks, UsersRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import {
  CLOUD_AI_GENERATION_TIP_KEYS,
  PRIVATE_AI_GENERATION_TIP_KEYS,
} from '@/shared/lib/aiGenerationTips';

import { DetailTabProcessingView } from './DetailTabProcessingView';

export type AiTabProcessingVariant = 'summary' | 'tasks' | 'meetingDialogue';

type AiTabProcessingProps = {
  variant: AiTabProcessingVariant;
  progress: number;
  progressLabel?: string;
  phase: 'loading_model' | 'processing';
  color: Colors;
  onCancel?: () => void;
  isPrivateMode?: boolean;
};

const VARIANT_CONFIG = {
  summary: {
    Icon: FileText,
    titleKey: 'recordingDetail.summaryProcessing' as const,
  },
  tasks: {
    Icon: ListChecks,
    titleKey: 'recordingDetail.tasksProcessing' as const,
  },
  meetingDialogue: {
    Icon: UsersRound,
    titleKey: 'recordingDetail.meetingDialogueProcessing' as const,
  },
};

export const AiTabProcessing = ({
  variant,
  progress,
  progressLabel,
  phase,
  color,
  onCancel,
  isPrivateMode = false,
}: AiTabProcessingProps) => {
  const { t } = useTranslation();
  const { Icon, titleKey } = VARIANT_CONFIG[variant];

  return (
    <DetailTabProcessingView
      progress={progress}
      progressLabel={progressLabel}
      phase={phase}
      color={color}
      onCancel={onCancel}
      context={isPrivateMode ? 'private_llm' : 'cloud_ai'}
      tipKeys={isPrivateMode ? PRIVATE_AI_GENERATION_TIP_KEYS : CLOUD_AI_GENERATION_TIP_KEYS}
      statusTitle={isPrivateMode ? undefined : t(titleKey)}
      leadingIcon={<Icon size={22} color={color.accent.primary} strokeWidth={2} />}
    />
  );
};
