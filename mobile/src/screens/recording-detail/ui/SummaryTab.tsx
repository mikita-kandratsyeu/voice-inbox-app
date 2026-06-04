import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  ListChecks,
  RefreshCw,
  Share,
  UsersRound,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RecordingStatus } from '@/entities/record';
import {
  isPrivateCustomServerMode,
  resolveAiModelDisplayLabel,
  useSettingsStore,
} from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAiModelName, useAiTabBannerDismiss, useNetworkStatus } from '@/shared/lib';
import type { SummaryTokenUsage } from '@/shared/lib/summaryMetaSubtitle';
import { AiTabErrorBanner, AiTabHintIcon, Button, TabEmptyState } from '@/shared/ui';

import {
  type MeetingRecapSection,
  parseMeetingRecapSummary,
} from '../lib/parseMeetingRecapSummary';
import { AiTabProcessing } from './AiTabProcessing';
import { MeetingTabInfoCallout, MeetingTabInfoCalloutText } from './MeetingTabInfoCallout';
import { PrivateModeTranscriptLimitNotice } from './PrivateModeTranscriptLimitNotice';
import { SummaryReasoningDisclosure } from './SummaryReasoningDisclosure';
import { SummaryRegenerateHintSheet } from './SummaryRegenerateHintSheet';

type SummaryTabProps = {
  summary: string;
  keyPhrases?: string[];
  status: RecordingStatus;
  errorMessage?: string;
  hasTranscript?: boolean;
  color: Colors;
  onGenerate: (options?: { taskExtractionHint?: string }) => void;
  isMeeting?: boolean;
  onShareMeetingBrief?: () => void;
  onDismissError?: () => void;
  showPrivateModeCta?: boolean;
  onSwitchToSmartMode?: () => void;
  onCancelProcessing?: () => void;
  /** Phase-2 speaker breakdown in progress; block full regenerate on summary. */
  speakerBreakdownProcessing?: boolean;
  isPrivateMode?: boolean;
  isPrivateCustomServer?: boolean;
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
  privateAiBatchStartedAt?: number;
  transcriptCharCount?: number;
  cloudMeetingDialogueExtra?: boolean;
  summaryReasoning?: string;
  summaryAiModel?: string;
  summaryAiModelLabel?: string;
  summaryTokenUsage?: SummaryTokenUsage;
  summaryGenerationMs?: number;
};

function MeetingRecapSectionBlock({
  section,
  color,
}: {
  section: MeetingRecapSection;
  color: Colors;
}) {
  const iconColor =
    section.kind === 'decisions'
      ? color.accent.success
      : section.kind === 'openQuestions'
        ? color.accent.cache
        : color.accent.primary;
  const icon =
    section.kind === 'decisions' ? (
      <CheckCircle2 size={18} color={iconColor} strokeWidth={2} />
    ) : section.kind === 'tasks' ? (
      <ClipboardList size={18} color={iconColor} strokeWidth={2} />
    ) : section.kind === 'openQuestions' ? (
      <HelpCircle size={18} color={iconColor} strokeWidth={2} />
    ) : section.kind === 'nextSteps' ? (
      <ListChecks size={18} color={iconColor} strokeWidth={2} />
    ) : (
      <FileText size={18} color={iconColor} strokeWidth={2} />
    );

  return (
    <View className="gap-2 rounded-xl border p-3" style={{ borderColor: color.border.default }}>
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-[13px] font-semibold" style={{ color: color.text.primary }}>
          {section.title}
        </Text>
      </View>
      <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
        {section.body}
      </Text>
    </View>
  );
}

export const SummaryTab = ({
  color,
  errorMessage,
  hasTranscript = true,
  keyPhrases = [],
  isMeeting = false,
  onDismissError,
  onGenerate,
  onShareMeetingBrief,
  onCancelProcessing,
  speakerBreakdownProcessing = false,
  privateAiBatchPhase,
  privateAiBatchProgress,
  privateAiBatchProgressLabel,
  privateAiBatchStartedAt,
  transcriptCharCount,
  cloudMeetingDialogueExtra = false,
  showPrivateModeCta = false,
  status,
  summary,
  isPrivateMode = false,
  isPrivateCustomServer = false,
  summaryReasoning,
  summaryAiModel,
  summaryAiModelLabel,
  summaryTokenUsage,
  summaryGenerationMs,
}: SummaryTabProps) => {
  const { t } = useTranslation();
  const { showBanner, handleDismiss } = useAiTabBannerDismiss(status, onDismissError);
  const aiModelName = useAiModelName();
  const { isConnected } = useNetworkStatus();
  const { aiExecutionMode, privateAiProvider, showSummaryReasoningInNotes } = useSettingsStore(
    useShallow((s) => ({
      aiExecutionMode: s.aiExecutionMode,
      privateAiProvider: s.privateAiProvider,
      showSummaryReasoningInNotes: s.showSummaryReasoningInNotes,
    })),
  );
  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';
  const regenerateDisabled = disableByNetwork || speakerBreakdownProcessing;
  const [regenerateSheetOpen, setRegenerateSheetOpen] = useState(false);

  const regenerateSheet = useMemo(
    () => (
      <SummaryRegenerateHintSheet
        visible={regenerateSheetOpen}
        isMeeting={isMeeting}
        onClose={() => setRegenerateSheetOpen(false)}
        onConfirm={(hint) => {
          onGenerate(hint ? { taskExtractionHint: hint } : undefined);
        }}
      />
    ),
    [isMeeting, onGenerate, regenerateSheetOpen],
  );

  const summaryModelLabel = useMemo(
    () => resolveAiModelDisplayLabel(summaryAiModel, summaryAiModelLabel),
    [summaryAiModel, summaryAiModelLabel],
  );

  const isSmartMode = aiExecutionMode === 'smart_hybrid';
  const isPrivateCustomServerModeActive = isPrivateCustomServerMode(
    aiExecutionMode,
    privateAiProvider,
  );
  const showReasoningBlock =
    (isSmartMode || isPrivateCustomServerModeActive) &&
    showSummaryReasoningInNotes &&
    Boolean(summaryReasoning?.trim());
  const modelHint = aiModelName.trim() ? aiModelName : undefined;
  const meetingRecapSections = useMemo(
    () => (isMeeting ? parseMeetingRecapSummary(summary) : []),
    [isMeeting, summary],
  );

  const errMessage = useMemo(() => {
    return errorMessage ?? (showPrivateModeCta ? t('recordingDetail.privateModeErrorHint') : '');
  }, [errorMessage, showPrivateModeCta, t]);

  if (status === 'processing') {
    return (
      <AiTabProcessing
        variant="summary"
        progress={privateAiBatchProgress ?? 0}
        progressLabel={privateAiBatchProgressLabel}
        phase={
          privateAiBatchPhase ??
          (isPrivateCustomServer ? 'processing' : isPrivateMode ? 'loading_model' : 'processing')
        }
        color={color}
        onCancel={onCancelProcessing}
        isPrivateMode={isPrivateMode}
        isPrivateCustomServer={isPrivateCustomServer}
        processingStartedAtMs={privateAiBatchStartedAt}
        transcriptCharCount={transcriptCharCount}
        cloudMeetingDialogueExtra={cloudMeetingDialogueExtra && speakerBreakdownProcessing}
      />
    );
  }

  if (status === 'error' && !summary) {
    return (
      <View className="gap-3 p-4">
        <TabEmptyState
          icon={<AlertCircle size={28} color={color.accent.delete} strokeWidth={1.8} />}
          title={t('recordingDetail.summaryError')}
          description={errMessage}
          buttonLabel={t('recordingDetail.summaryRetry')}
          buttonIcon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
          onPress={onGenerate}
        />
      </View>
    );
  }

  if (!hasTranscript) {
    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.noTranscriptForAi')}
        description={t('recordingDetail.noTranscriptForAiDesc')}
      />
    );
  }

  if (!summary) {
    return (
      <View className="gap-3 p-4">
        <PrivateModeTranscriptLimitNotice color={color} transcriptCharCount={transcriptCharCount} />
        <TabEmptyState
          icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
          title={t('recordingDetail.summaryNotCreated')}
          description={t('recordingDetail.summaryNotCreatedDesc')}
          buttonLabel={t('recordingDetail.generateSummary')}
          buttonIcon={<FileText size={18} color="#fff" strokeWidth={2} />}
          hint={modelHint}
          hintIcon={modelHint ? <AiTabHintIcon /> : undefined}
          disabled={disableByNetwork}
          onPress={onGenerate}
        />
      </View>
    );
  }

  return (
    <View className="gap-3.5 p-4">
      <PrivateModeTranscriptLimitNotice color={color} transcriptCharCount={transcriptCharCount} />
      {showBanner && <AiTabErrorBanner message={errMessage} onDismiss={handleDismiss} />}
      {speakerBreakdownProcessing ? (
        <View
          className="rounded-xl border p-3"
          style={{
            borderColor: color.border.default,
            backgroundColor: color.background.tertiary,
          }}
        >
          <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
            {privateAiBatchProgressLabel?.trim() ||
              t('recordingDetail.regenerateSummaryWaitForSpeakers')}
          </Text>
        </View>
      ) : null}
      {isMeeting && (
        <MeetingTabInfoCallout
          color={color}
          icon={<UsersRound size={20} color={color.accent.primary} strokeWidth={2} />}
          title={t('recordingDetail.meetingSummaryTitle')}
        >
          <MeetingTabInfoCalloutText color={color}>
            {t('recordingDetail.meetingSummaryDescription')}
          </MeetingTabInfoCalloutText>
        </MeetingTabInfoCallout>
      )}
      {meetingRecapSections.length > 0 ? (
        <View className="gap-3">
          {meetingRecapSections.map((section) => (
            <MeetingRecapSectionBlock
              key={`${section.kind}:${section.title}`}
              section={section}
              color={color}
            />
          ))}
        </View>
      ) : (
        <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
          {summary}
        </Text>
      )}
      {showReasoningBlock && summaryReasoning ? (
        <SummaryReasoningDisclosure
          reasoning={summaryReasoning}
          color={color}
          modelLabel={isPrivateCustomServerModeActive ? undefined : summaryModelLabel || undefined}
          tokenUsage={summaryTokenUsage}
          generationDurationMs={summaryGenerationMs}
        />
      ) : null}
      {keyPhrases.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase" style={{ color: color.text.secondary }}>
            {t('recordingDetail.keyPhrases')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {keyPhrases.map((phrase) => (
              <View
                key={phrase}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: color.background.tertiary,
                }}
              >
                <Text className="text-sm" style={{ color: color.text.primary }}>
                  {phrase}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Button
        variant="secondary"
        size="lg"
        icon={<RefreshCw size={15} color={color.text.primary} strokeWidth={2} />}
        label={t('recordingDetail.regenerateSummary')}
        color={color}
        onPress={() => setRegenerateSheetOpen(true)}
        disabled={regenerateDisabled}
        className="mt-1"
        accessibilityState={{ disabled: regenerateDisabled }}
      />
      {speakerBreakdownProcessing ? (
        <Text className="text-center text-xs leading-5" style={{ color: color.text.secondary }}>
          {t('recordingDetail.regenerateSummaryWaitForSpeakers')}
        </Text>
      ) : null}
      {isMeeting && onShareMeetingBrief && (
        <Button
          variant="primary"
          size="lg"
          icon={<Share size={15} color="#fff" strokeWidth={2} />}
          label={t('recordingDetail.shareMeetingBrief')}
          color={color}
          onPress={onShareMeetingBrief}
        />
      )}
      {regenerateSheet}
    </View>
  );
};
