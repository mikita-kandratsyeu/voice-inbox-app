import Clipboard from '@react-native-clipboard/clipboard';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  ArrowRight,
  Copy,
  MessageSquare,
  RefreshCw,
  Share2,
  Sparkles,
  WifiOff,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardController,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { type AskAIHistoryItem, useAskAI } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import {
  hapticSelection,
  useIsTablet,
  useNetworkStatus,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { Button, getInputFieldInputStyle, InputField, ScreenHeader } from '@/shared/ui';

import { DetailTabProcessingView } from './DetailTabProcessingView';

const SUGGESTED_QUESTION_KEYS = ['askSuggested1', 'askSuggested2', 'askSuggested3'] as const;

type NoTranscriptStateProps = { color: Colors };
const NoTranscriptState = ({ color }: NoTranscriptStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full items-center gap-3 px-1 py-4">
      <View
        className="h-[56px] w-[56px] items-center justify-center rounded-full"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <MessageSquare size={24} color={color.icon.muted} strokeWidth={1.8} />
      </View>
      <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.noTranscriptForAi')}
      </Text>
      <Text className="text-center text-[15px] leading-6" style={{ color: color.text.secondary }}>
        {t('recordingDetail.noTranscriptForAiDesc')}
      </Text>
    </View>
  );
};

type LoadingStateProps = { color: Colors };
const LoadingState = ({ color }: LoadingStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full items-center gap-3 py-6">
      <ActivityIndicator color={color.accent.primary} size="large" />
      <Text className="text-[15px] leading-6" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askProcessing')}
      </Text>
    </View>
  );
};

type ErrorStateProps = {
  color: Colors;
  onRetry: () => void;
  showPrivateModeCta?: boolean;
};
const ErrorState = ({ color, onRetry, showPrivateModeCta = false }: ErrorStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full items-center gap-4 px-1 py-4">
      <AlertCircle size={40} color={color.accent.delete} strokeWidth={1.8} />
      <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.askError')}
      </Text>
      <Text className="text-center text-[15px] leading-6" style={{ color: color.text.secondary }}>
        {showPrivateModeCta
          ? t('recordingDetail.privateModeErrorHint')
          : t('recordingDetail.askErrorContinueHint')}
      </Text>
      <Button
        variant="primary"
        size="lg"
        icon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
        label={t('recordingDetail.summaryRetry')}
        color={color}
        onPress={onRetry}
        containerStyle={{ flex: 1, minWidth: 0 }}
      />
    </View>
  );
};

type AnswerBlockProps = {
  color: Colors;
  question: string;
  answer: string;
  showLabel?: boolean;
};
const AnswerBlock = ({ color, question, answer, showLabel = true }: AnswerBlockProps) => {
  const { t } = useTranslation();
  return (
    <View className="gap-2 pb-4">
      {question && (
        <View className="gap-1">
          {showLabel && (
            <Text className="text-sm font-semibold" style={{ color: color.text.secondary }}>
              {t('recordingDetail.ask')}
            </Text>
          )}
          <Text className="text-base leading-6" style={{ color: color.text.primary }}>
            {question}
          </Text>
        </View>
      )}
      <Text className="text-base leading-7" style={{ color: color.text.primary }}>
        {answer}
      </Text>
    </View>
  );
};

type AnswerContentProps = {
  color: Colors;
  record: VoiceRecord;
  history: AskAIHistoryItem[];
  question: string;
  answer: string;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
  onAskAnother: () => void;
  onFollowUpQuestion: (question: string) => void;
};
const AnswerContent = ({
  color,
  record,
  history,
  question,
  answer,
  onCopy,
  onShare,
  onAskAnother,
  onFollowUpQuestion,
}: AnswerContentProps) => {
  const { t } = useTranslation();
  const shareText = `${answer}\n\n— ${record.title}`;
  const followUpQuestions = useMemo(() => buildFollowUpQuestions(t, record), [t, record]);

  return (
    <View className="gap-4 pb-4">
      <View
        className="rounded-xl px-3 py-2"
        style={{
          backgroundColor: color.background.tertiary,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        <Text className="text-sm leading-5" style={{ color: color.text.secondary }}>
          {t('recordingDetail.askEmptyTitle')} • {record.title}
        </Text>
      </View>
      {history.map((item, index) => (
        <AnswerBlock
          key={`${index}-${item.question.slice(0, 20)}`}
          color={color}
          question={item.question}
          answer={item.answer}
          showLabel={true}
        />
      ))}
      <AnswerBlock
        color={color}
        question={question}
        answer={answer}
        showLabel={history.length > 0}
      />
      <View className="flex-row flex-wrap gap-2">
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            onCopy(answer);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('recordingDetail.askCopy')}
          className="flex-row items-center gap-2 rounded-xl px-4 py-2.5"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Copy size={18} color={color.text.primary} strokeWidth={2} />
          <Text className="text-base font-medium" style={{ color: color.text.primary }}>
            {t('recordingDetail.askCopy')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            onShare(shareText, record.title);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('recordingDetail.askShare')}
          className="flex-row items-center gap-2 rounded-xl px-4 py-2.5"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Share2 size={18} color={color.text.primary} strokeWidth={2} />
          <Text className="text-base font-medium" style={{ color: color.text.primary }}>
            {t('recordingDetail.askShare')}
          </Text>
        </TouchableOpacity>
      </View>
      <Button
        variant="secondary"
        size="lg"
        label={t('recordingDetail.askAnother')}
        color={color}
        onPress={onAskAnother}
      />
      <View className="gap-2">
        <Text className="text-sm font-semibold" style={{ color: color.text.secondary }}>
          {t('recordingDetail.nextSteps')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {followUpQuestions.map((followUpQuestion) => (
            <TouchableOpacity
              key={followUpQuestion}
              onPress={() => {
                hapticSelection();
                onFollowUpQuestion(followUpQuestion);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={followUpQuestion}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <Text className="text-base leading-6" style={{ color: color.text.primary }}>
                {followUpQuestion}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const SUGGESTED_QUESTION_LIMIT = 3;

function buildSuggestedQuestions(
  t: (key: string, opts?: { task?: string }) => string,
  record: VoiceRecord,
): string[] {
  const dynamic: string[] = [];
  if (record.summary?.trim()) {
    dynamic.push(t('recordingDetail.askSuggestedSummary'));
  }
  if (record.tasks && record.tasks.length > 0) {
    dynamic.push(t('recordingDetail.askSuggestedTasks'));
    const firstTask = record.tasks[0];
    if (firstTask?.text) {
      dynamic.push(t('recordingDetail.askSuggestedTaskAbout', { task: firstTask.text }));
    }
  }
  if (record.tags && record.tags.length > 0) {
    dynamic.push(t('recordingDetail.askSuggestedTags'));
  }
  const staticQuestions = SUGGESTED_QUESTION_KEYS.map((key) => t(`recordingDetail.${key}`));
  return [...dynamic, ...staticQuestions].slice(0, SUGGESTED_QUESTION_LIMIT);
}

function buildFollowUpQuestions(
  t: (key: string, opts?: { task?: string }) => string,
  record: VoiceRecord,
): string[] {
  const list: string[] = [t('recordingDetail.askSuggested2'), t('recordingDetail.askSuggested3')];
  if (record.tasks && record.tasks.length > 0) list.push(t('recordingDetail.askSuggestedTasks'));
  if (record.summary?.trim()) list.push(t('recordingDetail.askSuggestedSummary'));
  return list.slice(0, SUGGESTED_QUESTION_LIMIT);
}

type EmptyStateProps = {
  color: Colors;
  record: VoiceRecord;
  showOfflineState: boolean;
  onSuggestedQuestion: (question: string) => void;
  disabled?: boolean;
};
const EmptyState = ({
  color,
  record,
  showOfflineState,
  onSuggestedQuestion,
  disabled,
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const suggestedQuestions = useMemo(() => buildSuggestedQuestions(t, record), [t, record]);

  return (
    <View className="gap-3 pb-1 pt-1">
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <MessageSquare size={22} color={color.icon.muted} strokeWidth={1.8} />
        </View>
        <Text className="flex-1 text-[15px] leading-6" style={{ color: color.text.secondary }}>
          {t('recordingDetail.askEmptyDesc')}
        </Text>
      </View>
      {showOfflineState ? (
        <View
          className="flex-row items-center gap-2 rounded-lg px-3 py-2.5"
          style={{
            backgroundColor: color.background.tertiary,
            borderWidth: 1,
            borderColor: color.border.default,
          }}
        >
          <WifiOff size={18} color={color.accent.delete} strokeWidth={1.8} />
          <Text className="flex-1 text-[15px] leading-6" style={{ color: color.text.secondary }}>
            {t('recordingDetail.askOfflineNetworkHint')}
          </Text>
        </View>
      ) : null}
      <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askSuggestedSection')}
      </Text>
      <View className="gap-3">
        {suggestedQuestions.map((questionText) => (
          <TouchableOpacity
            key={questionText}
            onPress={() => {
              hapticSelection();
              onSuggestedQuestion(questionText);
            }}
            disabled={disabled || showOfflineState}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={questionText}
            accessibilityState={{ disabled: Boolean(disabled || showOfflineState) }}
            className="rounded-xl px-4 py-4"
            style={{ backgroundColor: color.background.tertiary }}
          >
            <Text
              className="text-[15px] font-normal leading-[22px]"
              style={{ color: color.text.primary }}
            >
              {questionText}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export const AskAIScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingAskAI'>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const contentMaxWidth = useTabletContentMaxWidth();
  const isTablet = useIsTablet();

  const { record: routeRecord } = route.params;
  const hydrateRecordDetails = useRecordStore((s) => s.hydrateRecordDetails);
  const liveRecord = useRecordStore(
    useShallow((s) => s.records.find((r) => r.id === routeRecord.id) ?? routeRecord),
  );

  const [questionInput, setQuestionInput] = useState('');
  const {
    askQuestion,
    askAnother,
    isLoading,
    error,
    question,
    answer,
    history,
    privateAskProgress,
    privateAskPhase,
  } = useAskAI(liveRecord.id, liveRecord.transcript ?? '');
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);

  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';
  const hasTranscript = Boolean(liveRecord.transcript);

  const priorTurnsForAsk = useMemo((): AskAIHistoryItem[] => {
    const currentPair = question && answer ? [{ question, answer } satisfies AskAIHistoryItem] : [];
    return [...history, ...currentPair];
  }, [history, question, answer]);

  const answerScrollRef = useRef<React.ElementRef<typeof KeyboardAwareScrollView>>(null);

  useEffect(() => {
    if (!answer || isLoading) return;
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
  }, [answer, history.length, isLoading]);

  useEffect(() => {
    void hydrateRecordDetails(routeRecord.id);
  }, [hydrateRecordDetails, routeRecord.id]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        KeyboardController.dismiss({ animated: false });
      };
    }, []),
  );

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
      askQuestion(liveRecord, q, priorTurnsForAsk);
    },
    [hasTranscript, isLoading, disableByNetwork, liveRecord, askQuestion, priorTurnsForAsk],
  );

  const handleRetry = useCallback(() => {
    if (question) askQuestion(liveRecord, question, priorTurnsForAsk);
  }, [question, liveRecord, askQuestion, priorTurnsForAsk]);

  const handleCopy = useCallback((text: string) => {
    Clipboard.setString(text);
  }, []);

  const handleShare = useCallback((text: string, title: string) => {
    Share.share({
      message: text,
      title,
    });
  }, []);

  const renderContent = useCallback(() => {
    if (!hasTranscript) return <NoTranscriptState color={color} />;
    if (isLoading) {
      if (aiExecutionMode === 'private_experimental') {
        return (
          <DetailTabProcessingView
            progress={privateAskProgress}
            phase={privateAskPhase}
            color={color}
            hintText={t('privateAi.batteryHint')}
            leadingIcon={<Sparkles size={22} color={color.accent.primary} strokeWidth={2} />}
            context="private_llm"
          />
        );
      }
      return <LoadingState color={color} />;
    }

    if (error && !answer)
      return (
        <ErrorState
          color={color}
          onRetry={handleRetry}
          showPrivateModeCta={aiExecutionMode === 'private_experimental'}
        />
      );

    if (answer)
      return (
        <AnswerContent
          color={color}
          record={liveRecord}
          history={history}
          question={question ?? ''}
          answer={answer}
          onCopy={handleCopy}
          onShare={handleShare}
          onAskAnother={askAnother}
          onFollowUpQuestion={handleSuggestedQuestion}
        />
      );

    return (
      <EmptyState
        color={color}
        record={liveRecord}
        showOfflineState={disableByNetwork}
        onSuggestedQuestion={handleSuggestedQuestion}
        disabled={isLoading}
      />
    );
  }, [
    hasTranscript,
    isLoading,
    error,
    answer,
    question,
    history,
    privateAskProgress,
    privateAskPhase,
    color,
    liveRecord,
    disableByNetwork,
    handleRetry,
    aiExecutionMode,
    t,
    handleSuggestedQuestion,
    handleCopy,
    handleShare,
    askAnother,
  ]);

  const shouldShowInputRow = hasTranscript && !isLoading;
  const scrollContentCentered =
    !hasTranscript || isLoading || Boolean(error && !answer && hasTranscript);
  const canSend = Boolean(questionInput.trim()) && hasTranscript && !isLoading && !disableByNetwork;

  const sendButton = useMemo(
    () => (
      <View style={{ flexShrink: 0 }}>
        <Button
          variant="primary"
          size="md"
          icon={<ArrowRight size={18} color="#fff" strokeWidth={2.5} />}
          iconOnly
          color={color}
          containerStyle={{ backgroundColor: color.accent.primary }}
          onPress={handleAsk}
          disabled={!canSend}
          accessibilityLabel={t('recordingDetail.askSend')}
          accessibilityState={{ disabled: !canSend }}
        />
      </View>
    ),
    [color, handleAsk, canSend, t],
  );

  const inputFooter = useMemo(() => {
    if (!shouldShowInputRow) {
      return null;
    }

    const hasInputText = questionInput.trim().length > 0;

    return (
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: color.border.default,
          backgroundColor: color.background.secondary,
          paddingHorizontal: isTablet ? 80 : 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <InputField
          color={color}
          hasValue={hasInputText}
          rightElement={sendButton}
          containerStyle={{
            minHeight: 52,
            alignItems: hasInputText ? 'flex-start' : 'center',
          }}
        >
          <TextInput
            style={[
              getInputFieldInputStyle(color, hasInputText),
              {
                fontSize: 17,
                minHeight: hasInputText ? 26 : 22,
                maxHeight: 100,
              },
            ]}
            placeholder={t('recordingDetail.askPlaceholder')}
            placeholderTextColor={color.text.secondary}
            accessibilityLabel={t('recordingDetail.askPlaceholder')}
            value={questionInput}
            onChangeText={setQuestionInput}
            returnKeyType="send"
            editable={!disableByNetwork}
            multiline
            numberOfLines={1}
            blurOnSubmit
            onSubmitEditing={handleAsk}
          />
        </InputField>
      </View>
    );
  }, [
    shouldShowInputRow,
    questionInput,
    color,
    insets.bottom,
    sendButton,
    isTablet,
    t,
    disableByNetwork,
    handleAsk,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('recordingDetail.askEmptyTitle')} onBack={handleBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignSelf: 'center',
              width: '100%',
              maxWidth: contentMaxWidth ?? '100%',
            }}
          >
            <KeyboardAwareScrollView
              ref={answerScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 16,
                ...(scrollContentCentered
                  ? { flexGrow: 1, justifyContent: 'center' as const }
                  : {}),
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={Boolean(answer)}
              bottomOffset={24}
            >
              {renderContent()}
            </KeyboardAwareScrollView>
          </View>
          {inputFooter}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
