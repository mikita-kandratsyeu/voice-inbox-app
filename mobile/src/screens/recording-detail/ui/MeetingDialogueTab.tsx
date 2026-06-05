import { AlertCircle, FileText, RefreshCw, UsersRound } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Switch, Text, View } from 'react-native';

import type { RecordingStatus } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAiModelName, useAiTabBannerDismiss, useNetworkStatus } from '@/shared/lib';
import { AiTabErrorBanner, AiTabHintIcon, Button, TabEmptyState } from '@/shared/ui';

import { buildSpeakerRoster, shouldShowInlineSpeakerLabel } from '../lib/buildSpeakerRoster';
import {
  analyzeMeetingDialogueHeuristics,
  applySpeakerLabelsToUtterances,
  displaySpeakerLabel,
  type MeetingSpeakerLabels,
  normalizeSpeakerLabelKey,
} from '../lib/meetingSpeakerLabels';
import { parseMeetingDialogue } from '../lib/parseMeetingDialogue';
import { AiTabProcessing } from './AiTabProcessing';
import { MeetingDialogueSpeakerRoster } from './MeetingDialogueSpeakerRoster';
import { MeetingDialogueUtteranceCard } from './MeetingDialogueUtteranceCard';
import { MeetingTabInfoCallout, MeetingTabInfoCalloutText } from './MeetingTabInfoCallout';
import { PrivateModeTranscriptLimitNotice } from './PrivateModeTranscriptLimitNotice';
import { TaskEditSheet } from './TaskEditSheet';

type MeetingDialogueTabProps = {
  meetingDialogue?: string;
  speakerLabels?: MeetingSpeakerLabels;
  onRenameSpeaker?: (originalLabel: string, displayName: string) => void;
  onMergeSpeaker?: (sourceLabel: string, targetLabel: string) => void;
  hasTranscript: boolean;
  hasSummary?: boolean;
  /** Summary/tasks AI run in progress — block speaker breakdown actions. */
  summaryProcessing?: boolean;
  color: Colors;
  onGenerate: () => void;
  onRegenerateDialogueOnly?: () => void;
  canRegenerateDialogueOnly?: boolean;
  status: RecordingStatus;
  errorMessage?: string;
  onDismissError?: () => void;
  showPrivateModeCta?: boolean;
  onCancelProcessing?: () => void;
  isPrivateMode?: boolean;
  isPrivateCustomServer?: boolean;
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
  privateAiBatchStartedAt?: number;
  transcriptCharCount?: number;
  cloudMeetingDialogueExtra?: boolean;
};

type SpeakerRenameTarget = {
  originalLabel: string;
  initialDisplay: string;
};

export const MeetingDialogueTab = ({
  color,
  errorMessage,
  hasTranscript,
  hasSummary = false,
  summaryProcessing = false,
  meetingDialogue,
  speakerLabels,
  onRenameSpeaker,
  onMergeSpeaker,
  onRegenerateDialogueOnly,
  canRegenerateDialogueOnly = false,
  onGenerate,
  onCancelProcessing,
  onDismissError,
  privateAiBatchPhase,
  privateAiBatchProgress,
  privateAiBatchProgressLabel,
  privateAiBatchStartedAt,
  transcriptCharCount,
  cloudMeetingDialogueExtra = false,
  showPrivateModeCta = false,
  status,
  isPrivateMode = false,
  isPrivateCustomServer = false,
}: MeetingDialogueTabProps) => {
  const { t } = useTranslation();
  const { showBanner, handleDismiss } = useAiTabBannerDismiss(status, onDismissError);
  const aiModelName = useAiModelName();
  const modelHint = aiModelName.trim() ? aiModelName : undefined;
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';
  const blockDialogueActions = disableByNetwork || summaryProcessing;

  const [renameTarget, setRenameTarget] = useState<SpeakerRenameTarget | null>(null);
  const [speakerLabelsHidden, setSpeakerLabelsHidden] = useState(false);

  const rawUtterances = useMemo(
    () => parseMeetingDialogue(meetingDialogue ?? ''),
    [meetingDialogue],
  );

  const utterances = useMemo(
    () => applySpeakerLabelsToUtterances(rawUtterances, speakerLabels),
    [rawUtterances, speakerLabels],
  );

  const heuristics = useMemo(
    () => analyzeMeetingDialogueHeuristics(rawUtterances),
    [rawUtterances],
  );

  const speakerRoster = useMemo(
    () => buildSpeakerRoster(rawUtterances, speakerLabels),
    [rawUtterances, speakerLabels],
  );

  const showSpeakerRoster = Boolean(onRenameSpeaker && speakerRoster.length > 0);

  const errMessage = useMemo(() => {
    return errorMessage ?? (showPrivateModeCta ? t('recordingDetail.privateModeErrorHint') : '');
  }, [errorMessage, showPrivateModeCta, t]);

  const openRename = useCallback(
    (originalLabel: string) => {
      if (!onRenameSpeaker) return;
      const display = displaySpeakerLabel(originalLabel, speakerLabels) || originalLabel;
      setRenameTarget({ originalLabel, initialDisplay: display });
    },
    [onRenameSpeaker, speakerLabels],
  );

  const openMerge = useCallback(
    (sourceLabel: string) => {
      if (!onMergeSpeaker) return;
      const candidates = speakerRoster.filter((speaker) => speaker.originalLabel !== sourceLabel);
      if (candidates.length === 0) return;

      Alert.alert(
        t('recordingDetail.mergeSpeakerTitle'),
        t('recordingDetail.mergeSpeakerMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          ...candidates.slice(0, 6).map((speaker) => ({
            text: speaker.displayLabel,
            onPress: () => onMergeSpeaker(sourceLabel, speaker.originalLabel),
          })),
        ],
      );
    },
    [onMergeSpeaker, speakerRoster, t],
  );

  const renameSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={renameTarget !== null}
        initialText={renameTarget?.initialDisplay ?? ''}
        sheetTitleKey="recordingDetail.renameSpeakerTitle"
        placeholderKey="recordingDetail.renameSpeakerPlaceholder"
        onClose={() => setRenameTarget(null)}
        onSave={({ text }) => {
          if (!renameTarget || !onRenameSpeaker) return false;
          onRenameSpeaker(renameTarget.originalLabel, text);
          return true;
        }}
      />
    ),
    [onRenameSpeaker, renameTarget],
  );

  if (status === 'processing') {
    return (
      <>
        <AiTabProcessing
          variant="meetingDialogue"
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
          cloudMeetingDialogueExtra={cloudMeetingDialogueExtra}
        />
        {renameSheet}
      </>
    );
  }

  if (status === 'error' && utterances.length === 0) {
    const isMeetingDialogueOnlyFailure = Boolean(errorMessage?.trim());
    return (
      <View className="gap-3 p-4">
        <TabEmptyState
          icon={<AlertCircle size={28} color={color.accent.delete} strokeWidth={1.8} />}
          title={
            isMeetingDialogueOnlyFailure
              ? t('recordingDetail.meetingDialogueFailedTitle')
              : t('recordingDetail.summaryError')
          }
          description={
            isMeetingDialogueOnlyFailure
              ? errorMessage?.trim() || t('recordingDetail.meetingDialogueFailedDesc')
              : errMessage
          }
          buttonLabel={
            canRegenerateDialogueOnly
              ? t('recordingDetail.retryMeetingDialogue')
              : t('recordingDetail.summaryRetry')
          }
          buttonIcon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
          disabled={blockDialogueActions}
          onPress={
            canRegenerateDialogueOnly && onRegenerateDialogueOnly
              ? onRegenerateDialogueOnly
              : onGenerate
          }
        />
        {renameSheet}
      </View>
    );
  }

  if (!hasTranscript) {
    return (
      <>
        <TabEmptyState
          icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
          title={t('recordingDetail.noTranscriptForAi')}
          description={t('recordingDetail.noTranscriptForAiDesc')}
        />
        {renameSheet}
      </>
    );
  }

  if (utterances.length === 0) {
    const dialogueOnlyAction = canRegenerateDialogueOnly && Boolean(onRegenerateDialogueOnly);
    const emptyDescriptionKey = dialogueOnlyAction
      ? 'recordingDetail.meetingDialogueTabEmptyDescReady'
      : hasSummary
        ? 'recordingDetail.meetingDialogueTabEmptyDescReady'
        : 'recordingDetail.meetingDialogueTabEmptyDescNeedSummary';
    const emptyButtonLabel = dialogueOnlyAction
      ? t('recordingDetail.retryMeetingDialogue')
      : hasSummary
        ? t('recordingDetail.generateMeetingDialogue')
        : t('recordingDetail.generateMeetingDialogueWithSummary');
    const emptyButtonIcon = dialogueOnlyAction ? (
      <RefreshCw size={18} color="#fff" strokeWidth={2} />
    ) : (
      <UsersRound size={18} color="#fff" strokeWidth={2} />
    );
    return (
      <View className="gap-3 p-4">
        <PrivateModeTranscriptLimitNotice color={color} transcriptCharCount={transcriptCharCount} />
        <TabEmptyState
          icon={<UsersRound size={28} color={color.icon.muted} strokeWidth={1.8} />}
          title={t('recordingDetail.meetingDialogueTabEmptyTitle')}
          description={t(emptyDescriptionKey)}
          buttonLabel={emptyButtonLabel}
          buttonIcon={emptyButtonIcon}
          hint={dialogueOnlyAction ? undefined : modelHint}
          hintIcon={dialogueOnlyAction || !modelHint ? undefined : <AiTabHintIcon />}
          disabled={blockDialogueActions}
          onPress={dialogueOnlyAction ? onRegenerateDialogueOnly! : onGenerate}
        />
        {renameSheet}
      </View>
    );
  }

  return (
    <View className="gap-3.5 p-4">
      <PrivateModeTranscriptLimitNotice color={color} transcriptCharCount={transcriptCharCount} />
      {showBanner && <AiTabErrorBanner message={errMessage} onDismiss={handleDismiss} />}
      <MeetingTabInfoCallout
        color={color}
        icon={<UsersRound size={20} color={color.accent.primary} strokeWidth={2} />}
        title={t('recordingDetail.meetingDialogueTabCalloutTitle')}
      >
        <MeetingTabInfoCalloutText color={color}>
          {t('recordingDetail.meetingDialogueDisclaimer')}
        </MeetingTabInfoCalloutText>
        <MeetingTabInfoCalloutText color={color}>
          {t('recordingDetail.meetingDialogueNotRealDiarization')}
        </MeetingTabInfoCalloutText>
        {heuristics.showSingleSpeakerHint ? (
          <MeetingTabInfoCalloutText color={color} variant="muted">
            {t('recordingDetail.meetingDialogueSingleSpeakerHint')}
          </MeetingTabInfoCalloutText>
        ) : null}
        {heuristics.showNoSpeakerLabelsHint ? (
          <MeetingTabInfoCalloutText color={color} variant="muted">
            {t('recordingDetail.meetingDialogueNoLabelsHint')}
          </MeetingTabInfoCalloutText>
        ) : null}
      </MeetingTabInfoCallout>
      {showSpeakerRoster ? (
        <MeetingDialogueSpeakerRoster
          speakers={speakerRoster}
          color={color}
          onRename={openRename}
          onMerge={openMerge}
        />
      ) : null}
      {speakerRoster.length > 0 ? (
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.card,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Text style={{ color: color.text.secondary, fontSize: 13, lineHeight: 18, flex: 1 }}>
            {t('recordingDetail.hideSpeakerLabels')}
          </Text>
          <Switch
            value={speakerLabelsHidden}
            onValueChange={setSpeakerLabelsHidden}
            trackColor={{ false: color.background.tertiary, true: color.accent.primary }}
            thumbColor={color.icon.onAccent}
            accessibilityLabel={t('recordingDetail.hideSpeakerLabels')}
          />
        </View>
      ) : null}
      <View className="gap-2.5">
        {utterances.map((u, index) => {
          const rawLabel = rawUtterances[index]?.speakerLabel?.trim() ?? '';
          const key = `${index}-${normalizeSpeakerLabelKey(rawLabel)}-${u.body.slice(0, 24)}`;
          const showInlineSpeakerLabel =
            !speakerLabelsHidden && shouldShowInlineSpeakerLabel(rawUtterances, index);
          const speakerLabelVariant = showSpeakerRoster
            ? ('subtle' as const)
            : ('emphasized' as const);

          return (
            <MeetingDialogueUtteranceCard
              key={key}
              utterance={u}
              color={color}
              showInlineSpeakerLabel={showInlineSpeakerLabel}
              speakerLabelVariant={speakerLabelVariant}
              onRenameSpeaker={onRenameSpeaker ? openRename : undefined}
            />
          );
        })}
      </View>
      {canRegenerateDialogueOnly && onRegenerateDialogueOnly ? (
        <Button
          variant="secondary"
          size="lg"
          icon={<RefreshCw size={15} color={color.text.primary} strokeWidth={2} />}
          label={t('recordingDetail.retryMeetingDialogue')}
          color={color}
          onPress={onRegenerateDialogueOnly}
          disabled={blockDialogueActions}
          className="mt-1"
          accessibilityState={{ disabled: blockDialogueActions }}
        />
      ) : null}
      {renameSheet}
    </View>
  );
};
