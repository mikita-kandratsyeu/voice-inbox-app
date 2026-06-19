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
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { type AskAIHistoryItem, useAskAI } from '@/features/ask-ai';
import { useAskAiShakeBridge } from '@/features/shake-to-record';
import { useColors } from '@/shared/config';
import {
  hapticSuccess,
  IS_ANDROID,
  useNetworkStatus,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import {
  estimateFloatingFrostedInputBottomClearance,
  FrostedHeaderIconButton,
  ScreenHeader,
} from '@/shared/ui';

import { AskAIComposer } from './AskAIComposer';
import { AskMainContent } from './AskMainContent';

export const AskAIScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingAskAI'>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const contentMaxWidth = useTabletContentMaxWidth('wide');

  const { record: routeRecord } = route.params;
  const hydrateRecordDetails = useRecordStore((s) => s.hydrateRecordDetails);
  const liveRecord = useRecordStore(
    useShallow((s) => s.records.find((r) => r.id === routeRecord.id) ?? routeRecord),
  );

  const [questionInput, setQuestionInput] = useState('');
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const {
    askQuestion,
    cancelAsk,
    reset,
    syncAskSessionFromDb,
    isLoading,
    isRestoringSession,
    error,
    question,
    answer,
    answerKind,
    items,
    evidence,
    interpretations,
    suggestedFollowUps,
    history,
    privateAskProgress,
    privateAskPhase,
  } = useAskAI(liveRecord.id, liveRecord.transcript ?? '', liveRecord);
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);

  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';
  const hasTranscript = Boolean(liveRecord.transcript);

  const priorTurnsForAsk = useMemo((): AskAIHistoryItem[] => {
    const currentPair = question && answer ? [{ question, answer } satisfies AskAIHistoryItem] : [];
    return [...history, ...currentPair];
  }, [history, question, answer]);

  const answerScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!answer && !isLoading) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        answerScrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [answer, history.length, isLoading, question]);

  useEffect(() => {
    void hydrateRecordDetails(routeRecord.id);
  }, [hydrateRecordDetails, routeRecord.id]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      void syncAskSessionFromDb();
      return () => {
        setIsScreenFocused(false);
        KeyboardController.dismiss({ animated: false });
      };
    }, [syncAskSessionFromDb]),
  );

  useAskAiShakeBridge({
    isFocused: isScreenFocused,
    isLoading,
    onCancel: cancelAsk,
  });

  const handleBack = useCallback(() => {
    KeyboardController.dismiss({ animated: false });
    navigation.goBack();
  }, [navigation]);

  const handleAsk = useCallback(() => {
    const q = questionInput.trim();
    if (!q || !hasTranscript || isLoading || disableByNetwork) return;
    KeyboardController.dismiss();
    setQuestionInput('');
    askQuestion(liveRecord, q, priorTurnsForAsk);
  }, [
    questionInput,
    hasTranscript,
    isLoading,
    disableByNetwork,
    liveRecord,
    askQuestion,
    priorTurnsForAsk,
  ]);

  const handleSuggestedQuestion = useCallback(
    (q: string) => {
      if (!hasTranscript || isLoading || disableByNetwork) return;
      KeyboardController.dismiss();
      askQuestion(liveRecord, q, priorTurnsForAsk);
    },
    [hasTranscript, isLoading, disableByNetwork, liveRecord, askQuestion, priorTurnsForAsk],
  );

  const handleRetry = useCallback(() => {
    if (!question) return;
    KeyboardController.dismiss();
    askQuestion(liveRecord, question, priorTurnsForAsk);
  }, [question, liveRecord, askQuestion, priorTurnsForAsk]);

  const handleCopy = useCallback(
    (text: string) => {
      void Clipboard.setString(text);
      hapticSuccess();
      const msg = t('recordingDetail.askCopied');
      if (IS_ANDROID) {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      }
    },
    [t],
  );

  const handleShare = useCallback((text: string, title: string) => {
    Share.share({
      message: text,
      title,
    });
  }, []);

  const canClearAskHistory =
    hasTranscript &&
    !isRestoringSession &&
    !isLoading &&
    (history.length > 0 || Boolean(answer) || Boolean(question && error));

  const handleClearAskHistory = useCallback(() => {
    Alert.alert(
      t('recordingDetail.askClearHistoryTitle'),
      t('recordingDetail.askClearHistoryMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recordingDetail.askClearHistoryConfirm'),
          style: 'destructive',
          onPress: () => {
            KeyboardController.dismiss({ animated: false });
            reset();
          },
        },
      ],
    );
  }, [t, reset]);

  const clearHistoryHeaderButton = useMemo(
    () =>
      canClearAskHistory ? (
        <FrostedHeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<Trash2 size={18} color={color.accent.delete} strokeWidth={2.2} />}
          color={color}
          onPress={handleClearAskHistory}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('recordingDetail.askClearHistoryA11y')}
        />
      ) : null,
    [canClearAskHistory, color, handleClearAskHistory, t],
  );

  const shouldShowInputRow = hasTranscript && !isRestoringSession && !isLoading;
  const showStandaloneAskError =
    Boolean(error && !answer && hasTranscript) && history.length === 0 && !question?.trim();
  /** Fill scroll height for empty / standalone error states that vertically center content. */
  const scrollContentFlexGrow = !hasTranscript || showStandaloneAskError;
  const scrollContentCentered = scrollContentFlexGrow;
  const canSend =
    Boolean(questionInput.trim()) &&
    hasTranscript &&
    !isRestoringSession &&
    !isLoading &&
    !disableByNetwork;
  const composerBottomInset = estimateFloatingFrostedInputBottomClearance(insets.bottom);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('recordingDetail.askEmptyTitle')}
        onBack={handleBack}
        rightSlot={clearHistoryHeaderButton}
        dismissKeyboardOnPress
      />
      <View style={{ flex: 1, position: 'relative' }}>
        <View
          style={{
            flex: 1,
            alignSelf: 'center',
            width: '100%',
            maxWidth: contentMaxWidth ?? '100%',
          }}
        >
          <ScrollView
            ref={answerScrollRef}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={Boolean(answer)}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: shouldShowInputRow ? composerBottomInset + 16 : 16,
              ...(scrollContentFlexGrow ? { flexGrow: 1 } : {}),
              ...(scrollContentCentered ? { justifyContent: 'center' as const } : {}),
            }}
          >
            <AskMainContent
              color={color}
              liveRecord={liveRecord}
              hasTranscript={hasTranscript}
              isRestoringSession={isRestoringSession}
              isLoading={isLoading}
              error={error}
              question={question}
              answer={answer}
              answerKind={answerKind}
              items={items}
              evidence={evidence}
              interpretations={interpretations}
              suggestedFollowUps={suggestedFollowUps}
              history={history}
              privateAskProgress={privateAskProgress}
              privateAskPhase={privateAskPhase}
              aiExecutionMode={aiExecutionMode}
              privateAiProvider={privateAiProvider}
              disableByNetwork={disableByNetwork}
              onRetry={handleRetry}
              onCopy={handleCopy}
              onShare={handleShare}
              onFollowUp={handleSuggestedQuestion}
              onCancelAsk={cancelAsk}
            />
          </ScrollView>
        </View>
        {shouldShowInputRow ? (
          <AskAIComposer
            color={color}
            safeAreaBottom={insets.bottom}
            contentMaxWidth={contentMaxWidth}
            questionInput={questionInput}
            onChangeQuestion={setQuestionInput}
            onSubmit={handleAsk}
            canSend={canSend}
            disableByNetwork={disableByNetwork}
          />
        ) : null}
      </View>
    </View>
  );
};
