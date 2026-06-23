import Clipboard from '@react-native-clipboard/clipboard';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, ToastAndroid, View } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { areFoldersEnabledInAiMode, useSettingsStore } from '@/entities/settings';
import {
  AnswerTurnBlock,
  AskAIComposer,
  AskAiSuggestedQuestions,
  ErrorState,
  SessionRestoringSkeleton,
} from '@/features/ask-chat/ui';
import {
  buildInboxAskSuggestions,
  useInboxAsk,
  useInboxAskCorpusScope,
} from '@/features/inbox-ask';
import { resolveInboxEvidenceRecordId } from '@/features/inbox-ask/lib/enrichInboxAskEvidence';
import { InboxAskContextDisclosure } from '@/features/inbox-ask/ui/InboxAskContextDisclosure';
import { InboxAskCorpusScopeChipMenu } from '@/features/inbox-ask/ui/InboxAskCorpusScopeChipMenu';
import { useProEntitlement } from '@/features/pro-license';
import { useAskAiShakeBridge } from '@/features/shake-to-record';
import { useColors } from '@/shared/config';
import {
  hapticSuccess,
  IS_ANDROID,
  useNetworkStatus,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import type { AskEvidence } from '@/shared/lib/ai-core/types';
import {
  estimateAskAiComposerBottomClearance,
  FrostedHeaderIconButton,
  ScreenHeader,
} from '@/shared/ui';

import { ErrorWithHistoryState } from '../../recording-detail/ui/ask-ai/ErrorWithHistoryState';
import { LoadingState } from '../../recording-detail/ui/ask-ai/LoadingState';

export function InboxAskAIScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InboxAskAI'>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const contentMaxWidth = useTabletContentMaxWidth('wide');
  const scrollRef = useRef<ScrollView>(null);
  const [questionInput, setQuestionInput] = useState('');
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const stubRecord = useRecordStore((s) => s.records[0]);
  const records = useRecordStore((s) => s.records);

  const { includeArchived, setIncludeArchived, folderId, setFolderId } = useInboxAskCorpusScope(
    route.params.folderId ?? null,
  );
  const folders = useFolderStore((s) => s.folders);
  const { isProActive } = useProEntitlement();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const foldersEnabled = areFoldersEnabledInAiMode(aiExecutionMode, privateAiProvider, isProActive);

  const scope = useMemo(
    () => ({
      folderId: foldersEnabled ? folderId : null,
      includeArchived,
    }),
    [folderId, foldersEnabled, includeArchived],
  );

  const inboxAsk = useInboxAsk(scope);
  const { isConnected } = useNetworkStatus();
  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';

  useEffect(() => {
    void useFolderStore.getState().load();
  }, []);

  useEffect(() => {
    if (!folderId) return;
    if (folders.some((folder) => folder.id === folderId)) return;
    setFolderId(null);
  }, [folderId, folders, setFolderId]);

  const evidenceNotes = inboxAsk.lastUsedNotes;

  const resolveEvidenceRecordId = useCallback(
    (item: AskEvidence) => resolveInboxEvidenceRecordId(item, evidenceNotes),
    [evidenceNotes],
  );

  const handleOpenEvidenceNote = useCallback(
    (recordId: string) => {
      const record = records.find((item) => item.id === recordId);
      if (!record) return;
      navigation.navigate('RecordingDetail', { record });
    },
    [navigation, records],
  );

  const turnEvidenceProps = useMemo(
    () => ({
      resolveEvidenceRecordId,
      onEvidenceNotePress: handleOpenEvidenceNote,
    }),
    [handleOpenEvidenceNote, resolveEvidenceRecordId],
  );

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      void inboxAsk.syncInboxAskSessionFromDb();
      return () => {
        setIsScreenFocused(false);
        KeyboardController.dismiss({ animated: false });
      };
    }, [inboxAsk.syncInboxAskSessionFromDb]),
  );

  const initialQuestionHandledRef = useRef(false);

  useEffect(() => {
    if (inboxAsk.isRestoringSession) return;
    const q = route.params.question?.trim();
    if (!q || initialQuestionHandledRef.current) return;
    initialQuestionHandledRef.current = true;
    if (inboxAsk.isLoading) return;
    void inboxAsk.askQuestion(q);
  }, [inboxAsk, inboxAsk.isLoading, inboxAsk.isRestoringSession, route.params.question]);

  useEffect(() => {
    if (inboxAsk.isRestoringSession) return;
    const shouldScroll =
      inboxAsk.isLoading || Boolean(inboxAsk.answer?.trim()) || inboxAsk.history.length > 0;
    if (!shouldScroll) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [
    inboxAsk.answer,
    inboxAsk.history.length,
    inboxAsk.isLoading,
    inboxAsk.isRestoringSession,
    inboxAsk.question,
  ]);

  useAskAiShakeBridge({
    isFocused: isScreenFocused,
    isLoading: inboxAsk.isLoading,
    onCancel: inboxAsk.cancelAsk,
  });

  const handleSend = useCallback(() => {
    const trimmed = questionInput.trim();
    if (!trimmed || inboxAsk.isLoading || disableByNetwork) return;
    KeyboardController.dismiss();
    setQuestionInput('');
    void inboxAsk.askQuestion(trimmed);
  }, [disableByNetwork, inboxAsk, questionInput]);

  const handleSuggestedQuestion = useCallback(
    (q: string) => {
      if (inboxAsk.isLoading || disableByNetwork) return;
      KeyboardController.dismiss();
      setQuestionInput('');
      void inboxAsk.askQuestion(q);
    },
    [disableByNetwork, inboxAsk],
  );

  const shouldShowInputRow = !inboxAsk.isRestoringSession && !inboxAsk.isLoading;
  const canSend = questionInput.trim().length > 0 && !inboxAsk.isLoading && !disableByNetwork;

  const handleCopy = useCallback(
    (text: string) => {
      Clipboard.setString(text);
      if (IS_ANDROID) ToastAndroid.show(t('inboxAsk.copied'), ToastAndroid.SHORT);
    },
    [t],
  );

  const handleShare = useCallback(async (text: string, title: string) => {
    await Share.share({ message: text, title });
    hapticSuccess();
  }, []);

  const handleClearHistory = useCallback(() => {
    Alert.alert(t('inboxAsk.clearHistoryTitle'), t('inboxAsk.clearHistoryMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('inboxAsk.clearHistoryConfirm'),
        style: 'destructive',
        onPress: () => void inboxAsk.reset(),
      },
    ]);
  }, [inboxAsk, t]);

  const suggestedQuestions = useMemo(() => buildInboxAskSuggestions(t), [t]);
  const noteTitles = inboxAsk.lastUsedNotes.map((note) => note.title);
  const hasHistory = inboxAsk.history.length > 0 || Boolean(inboxAsk.question && inboxAsk.answer);

  const answerTurns = useMemo(() => {
    if (!inboxAsk.question?.trim() || !inboxAsk.answer?.trim()) {
      return inboxAsk.history;
    }
    return [
      ...inboxAsk.history,
      {
        question: inboxAsk.question,
        answer: inboxAsk.answer,
        answerKind: inboxAsk.answerKind,
        items: inboxAsk.items,
        interpretations: inboxAsk.interpretations,
        evidence: inboxAsk.evidence,
      },
    ];
  }, [
    inboxAsk.answer,
    inboxAsk.answerKind,
    inboxAsk.evidence,
    inboxAsk.history,
    inboxAsk.interpretations,
    inboxAsk.items,
    inboxAsk.question,
  ]);

  const followUpSuggestions = useMemo(
    () =>
      (inboxAsk.suggestedFollowUps ?? []).slice(0, 3).map((prompt) => ({
        label: prompt,
        prompt,
      })),
    [inboxAsk.suggestedFollowUps],
  );

  const corpusScopeChip = (
    <InboxAskCorpusScopeChipMenu
      color={color}
      includeArchived={includeArchived}
      onIncludeArchivedChange={setIncludeArchived}
      folderId={folderId}
      folders={folders}
      foldersEnabled={foldersEnabled}
      onFolderIdChange={setFolderId}
    />
  );

  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const inboxAskErrorStateProps = {
    titleKey: 'inboxAsk.errorTitle',
    retryLabelKey: 'inboxAsk.errorRetry',
    fallbackHintKey: isPrivateMode ? 'inboxAsk.errorPrivateHint' : 'inboxAsk.errorDefaultHint',
    showPrivateModeCta: isPrivateMode,
  } as const;

  const mainBody = (() => {
    if (inboxAsk.isRestoringSession) {
      return <SessionRestoringSkeleton color={color} />;
    }
    if (inboxAsk.isLoading && stubRecord) {
      return (
        <LoadingState
          color={color}
          record={stubRecord}
          priorDepth={inboxAsk.history.length}
          aiExecutionMode={aiExecutionMode}
          privateAiProvider={privateAiProvider}
          question={inboxAsk.question}
          history={inboxAsk.history}
          privateAskProgress={0}
          privateAskPhase="processing"
          onCopy={handleCopy}
          onShare={handleShare}
          onCancel={inboxAsk.cancelAsk}
          statusTitle={
            inboxAsk.phase === 'retrieving' ? t('inboxAsk.retrieving') : t('inboxAsk.processing')
          }
        />
      );
    }
    if (inboxAsk.error && !hasHistory) {
      return (
        <ErrorState
          color={color}
          errorMessage={inboxAsk.error}
          onRetry={() => {
            if (inboxAsk.question) void inboxAsk.askQuestion(inboxAsk.question);
          }}
          {...inboxAskErrorStateProps}
        />
      );
    }
    if (inboxAsk.error && hasHistory && stubRecord) {
      return (
        <ErrorWithHistoryState
          color={color}
          record={stubRecord}
          history={inboxAsk.history}
          question={inboxAsk.question}
          errorMessage={inboxAsk.error}
          aiExecutionMode={aiExecutionMode}
          onRetry={() => {
            if (inboxAsk.question) void inboxAsk.askQuestion(inboxAsk.question);
          }}
          onCopy={handleCopy}
          onShare={handleShare}
          errorTitleKey={inboxAskErrorStateProps.titleKey}
          errorRetryLabelKey={inboxAskErrorStateProps.retryLabelKey}
          errorFallbackHintKey={inboxAskErrorStateProps.fallbackHintKey}
          showPrivateModeCta={inboxAskErrorStateProps.showPrivateModeCta}
        />
      );
    }
    if (inboxAsk.question && inboxAsk.answer) {
      return (
        <View className="gap-4 pb-4">
          <InboxAskContextDisclosure
            color={color}
            notesUsed={inboxAsk.notesUsed}
            notesTotal={inboxAsk.notesTotal}
            notesDropped={inboxAsk.notesDropped}
            noteTitles={noteTitles}
          />
          {answerTurns.map((turn, index) => (
            <AnswerTurnBlock
              key={`${turn.question}-${index}`}
              color={color}
              question={turn.question}
              answer={turn.answer}
              answerKind={turn.answerKind}
              items={turn.items}
              interpretations={turn.interpretations}
              evidence={turn.evidence}
              recordTitle={t('inbox.title')}
              showDivider={index < answerTurns.length - 1}
              onCopy={handleCopy}
              onShare={handleShare}
              {...turnEvidenceProps}
            />
          ))}
          <AskAiSuggestedQuestions
            color={color}
            title={t('inboxAsk.suggestedSection')}
            suggestions={followUpSuggestions}
            onQuestionPress={handleSuggestedQuestion}
          />
        </View>
      );
    }

    return (
      <View className="gap-4 pb-1">
        <InboxAskContextDisclosure
          color={color}
          notesUsed={0}
          notesTotal={inboxAsk.notesTotal}
          notesDropped={0}
          noteTitles={[]}
        />
        <AskAiSuggestedQuestions
          color={color}
          title={t('inboxAsk.suggestedSection')}
          suggestions={suggestedQuestions}
          onQuestionPress={handleSuggestedQuestion}
          disabled={disableByNetwork}
        />
      </View>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('inboxAsk.title')}
        onBack={() => navigation.goBack()}
        dismissKeyboardOnPress
        rightSlot={
          hasHistory ? (
            <FrostedHeaderIconButton
              iconOnly
              variant="icon"
              size="md"
              color={color}
              icon={<Trash2 size={18} color={color.accent.delete} strokeWidth={2.2} />}
              onPress={handleClearHistory}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={t('inboxAsk.clearHistoryA11y')}
            />
          ) : null
        }
      />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom:
            (shouldShowInputRow
              ? estimateAskAiComposerBottomClearance(insets.bottom)
              : insets.bottom) + 16,
        }}
      >
        {mainBody}
      </ScrollView>
      {shouldShowInputRow ? (
        <AskAIComposer
          color={color}
          safeAreaBottom={insets.bottom}
          contentMaxWidth={contentMaxWidth}
          questionInput={questionInput}
          onChangeQuestion={setQuestionInput}
          onSubmit={handleSend}
          canSend={canSend}
          disableByNetwork={disableByNetwork}
          extraChips={corpusScopeChip}
          placeholderKey="inboxAsk.placeholder"
          sendA11yKey="inboxAsk.send"
        />
      ) : null}
    </View>
  );
}
