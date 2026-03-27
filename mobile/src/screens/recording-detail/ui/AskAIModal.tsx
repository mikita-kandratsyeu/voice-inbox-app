import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  AlertCircle,
  ArrowRight,
  Cloud,
  Copy,
  MessageSquare,
  RefreshCw,
  Share2,
  WifiOff,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { type AskAIHistoryItem, useAskAI } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';
import { hapticSelection, useNetworkStatus } from '@/shared/lib';
import { type AiUsage, getAiUsage } from '@/shared/lib/ai-api';
import { useAiModelName } from '@/shared/lib/useAiModelName';
import { Button, getInputFieldInputStyle, InputField } from '@/shared/ui';

const TOP_INSET = 48;

const SUGGESTED_QUESTION_KEYS = ['askSuggested1', 'askSuggested2', 'askSuggested3'] as const;

type AskAIModalProps = {
  visible: boolean;
  record: VoiceRecord;
  color: Colors;
  onDismiss?: () => void;
};

type NoTranscriptStateProps = { color: Colors };
const NoTranscriptState = ({ color }: NoTranscriptStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-3 py-8">
      <View
        className="h-[56px] w-[56px] items-center justify-center rounded-full"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <MessageSquare size={24} color={color.icon.muted} strokeWidth={1.8} />
      </View>
      <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.noTranscriptForAi')}
      </Text>
      <Text className="text-center text-sm" style={{ color: color.text.secondary }}>
        {t('recordingDetail.noTranscriptForAiDesc')}
      </Text>
    </View>
  );
};

type LoadingStateProps = { color: Colors };
const LoadingState = ({ color }: LoadingStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-3 py-10">
      <ActivityIndicator color={color.accent.primary} size="large" />
      <Text className="text-sm" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askProcessing')}
      </Text>
    </View>
  );
};

type ErrorStateProps = {
  color: Colors;
  onRetry: () => void;
  onClose: () => void;
  showPrivateModeCta?: boolean;
  onSwitchToSmartMode?: () => void;
};
const ErrorState = ({
  color,
  onRetry,
  onClose,
  showPrivateModeCta = false,
  onSwitchToSmartMode,
}: ErrorStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-4 py-8">
      <AlertCircle size={40} color={color.accent.delete} strokeWidth={1.8} />
      <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.askError')}
      </Text>
      <Text className="text-center text-sm" style={{ color: color.text.secondary }}>
        {showPrivateModeCta
          ? t('recordingDetail.privateModeErrorHint')
          : t('recordingDetail.askErrorContinueHint')}
      </Text>
      {showPrivateModeCta && onSwitchToSmartMode ? (
        <Button
          variant="secondary"
          size="lg"
          label={t('recordingDetail.switchToSmartMode')}
          color={color}
          onPress={onSwitchToSmartMode}
          containerStyle={{ width: '100%' }}
        />
      ) : null}
      <View className="flex-row gap-3">
        <Button
          variant="secondary"
          size="lg"
          label={t('recordingDetail.continueViewing')}
          color={color}
          onPress={onClose}
          containerStyle={{ flex: 1, minWidth: 0 }}
        />
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
            <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
              {t('recordingDetail.ask')}
            </Text>
          )}
          <Text className="text-sm" style={{ color: color.text.primary }}>
            {question}
          </Text>
        </View>
      )}
      <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
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
        <Text className="text-xs" style={{ color: color.text.secondary }}>
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
          <Copy size={16} color={color.text.primary} strokeWidth={2} />
          <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
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
          <Share2 size={16} color={color.text.primary} strokeWidth={2} />
          <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
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
        <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
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
              <Text className="text-sm" style={{ color: color.text.primary }}>
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
  isConnected: boolean | null;
  onSuggestedQuestion: (question: string) => void;
  disabled?: boolean;
};
const EmptyState = ({
  color,
  record,
  isConnected,
  onSuggestedQuestion,
  disabled,
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const aiModelName = useAiModelName();
  const hintIcon =
    isConnected === false ? (
      <WifiOff size={12} color={color.accent.delete} strokeWidth={1.8} />
    ) : (
      <Cloud size={12} color={color.text.secondary} strokeWidth={1.8} />
    );

  const suggestedQuestions = useMemo(() => buildSuggestedQuestions(t, record), [t, record]);

  return (
    <View className="gap-3 py-4">
      <View className="flex-row items-center gap-6 mb-1">
        <View
          className="h-[48px] w-[48px] items-center justify-center rounded-full"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <MessageSquare size={22} color={color.icon.muted} strokeWidth={1.8} />
        </View>
        <View className="gap-1">
          <Text className="text-base font-semibold" style={{ color: color.text.primary }}>
            {t('recordingDetail.askEmptyTitle')}
          </Text>
          <Text className="text-sm" style={{ color: color.text.secondary }}>
            {t('recordingDetail.askEmptyDesc')}
          </Text>
        </View>
      </View>
      <View className="mt-2 gap-2">
        {suggestedQuestions.map((questionText) => (
          <TouchableOpacity
            key={questionText}
            onPress={() => {
              hapticSelection();
              onSuggestedQuestion(questionText);
            }}
            disabled={disabled || isConnected === false}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={questionText}
            accessibilityState={{ disabled: Boolean(disabled || isConnected === false) }}
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: color.background.tertiary }}
          >
            <Text className="text-sm" style={{ color: color.text.primary }}>
              {questionText}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {aiModelName && (
        <View className="flex-row items-center gap-1">
          {hintIcon}
          <Text className="text-xs" style={{ color: color.text.secondary }}>
            {aiModelName}
          </Text>
        </View>
      )}
    </View>
  );
};

export const AskAIModal = ({ visible, record, color, onDismiss }: AskAIModalProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const snapPoints = useMemo(() => [screenHeight * 0.5, screenHeight * 0.75], [screenHeight]);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [questionInput, setQuestionInput] = useState('');
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const contentOpacity = useSharedValue(1);
  const { askQuestion, reset, askAnother, isLoading, error, question, answer, history } =
    useAskAI();
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const setAiExecutionMode = useSettingsStore((s) => s.setAiExecutionMode);
  const hasTranscript = Boolean(record.transcript);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    getAiUsage().then((data) => {
      if (!cancelled) setAiUsage(data ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.6} />
    ),
    [],
  );

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      reset();
      setQuestionInput('');
      setKeyboardHeight(0);
    }
  }, [visible, reset]);

  useEffect(() => {
    if (!visible) return;

    const onShow = (event: { endCoordinates: { height: number } }) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillChangeFrame', onShow)
        : Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillHide', onHide)
        : Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  const handleAsk = useCallback(() => {
    const q = questionInput.trim();
    if (!q || !hasTranscript || isLoading || isConnected === false) return;
    KeyboardController.dismiss();
    setQuestionInput('');
    askQuestion(record, q);
  }, [questionInput, hasTranscript, isLoading, isConnected, record, askQuestion]);

  const handleInputFocus = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const handleSuggestedQuestion = useCallback(
    (q: string) => {
      if (!hasTranscript || isLoading || isConnected === false) return;
      askQuestion(record, q);
    },
    [hasTranscript, isLoading, isConnected, record, askQuestion],
  );

  const handleRetry = useCallback(() => {
    if (question) askQuestion(record, question);
  }, [question, record, askQuestion]);
  const handleSwitchToSmartMode = useCallback(() => {
    setAiExecutionMode('smart_hybrid');
  }, [setAiExecutionMode]);

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
    if (isLoading) return <LoadingState color={color} />;

    if (error && !answer)
      return (
        <ErrorState
          color={color}
          onRetry={handleRetry}
          onClose={() => bottomSheetRef.current?.dismiss()}
          showPrivateModeCta={aiExecutionMode === 'private_experimental'}
          onSwitchToSmartMode={handleSwitchToSmartMode}
        />
      );

    if (answer)
      return (
        <AnswerContent
          color={color}
          record={record}
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
        record={record}
        isConnected={isConnected}
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
    color,
    record,
    isConnected,
    handleRetry,
    aiExecutionMode,
    handleSwitchToSmartMode,
    handleSuggestedQuestion,
    handleCopy,
    handleShare,
    askAnother,
  ]);

  const shouldShowInputRow = hasTranscript && !isLoading;

  const sendButton = useMemo(
    () => (
      <View style={{ flexShrink: 0, paddingBottom: 4 }}>
        <Button
          variant="primary"
          size="md"
          icon={<ArrowRight size={18} color="#fff" strokeWidth={2.5} />}
          iconOnly
          color={color}
          containerStyle={{ backgroundColor: color.accent.primary }}
          onPress={handleAsk}
          disabled={!questionInput.trim() || isLoading || isConnected === false}
          accessibilityLabel={t('recordingDetail.askSend')}
        />
      </View>
    ),
    [color, handleAsk, questionInput, isLoading, isConnected, t],
  );

  const inputRow = useMemo(
    () =>
      shouldShowInputRow ? (
        <View style={{ flexShrink: 0, paddingHorizontal: 20 }}>
          <InputField
            color={color}
            hasValue={Boolean(questionInput.trim())}
            rightElement={sendButton}
            containerStyle={{ minHeight: 52 }}
          >
            <BottomSheetTextInput
              style={[
                getInputFieldInputStyle(color, true),
                {
                  minHeight: 24,
                  maxHeight: 100,
                  textAlignVertical: (questionInput.trim().length > 0 ? 'top' : 'center') as
                    | 'top'
                    | 'center',
                },
              ]}
              placeholder={t('recordingDetail.askPlaceholder')}
              placeholderTextColor={color.text.secondary}
              accessibilityLabel={t('recordingDetail.askPlaceholder')}
              value={questionInput}
              onChangeText={setQuestionInput}
              returnKeyType="send"
              editable={isConnected !== false}
              multiline
              numberOfLines={1}
              submitBehavior="blurAndSubmit"
              onFocus={handleInputFocus}
              onSubmitEditing={handleAsk}
            />
          </InputField>
          {aiUsage && (
            <View className="mt-2 flex-row justify-end">
              <Text className="text-xs" style={{ color: color.text.secondary }}>
                {t('recordingDetail.askUsage', { used: aiUsage.used, limit: aiUsage.limit })}
              </Text>
            </View>
          )}
        </View>
      ) : null,
    [
      shouldShowInputRow,
      color,
      questionInput,
      sendButton,
      t,
      isConnected,
      handleAsk,
      handleInputFocus,
      aiUsage,
    ],
  );

  const bottomPadding = useMemo(
    () => Math.max(insets.bottom, 8) + (shouldShowInputRow ? 100 : 8),
    [insets.bottom, shouldShowInputRow],
  );
  const isKeyboardOpen = keyboardHeight > 0;
  useEffect(() => {
    contentOpacity.value = withTiming(isKeyboardOpen ? 0 : 1, { duration: 140 });
  }, [isKeyboardOpen, contentOpacity]);
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const inputContainerStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      right: 0,
      ...(isKeyboardOpen ? { top: 10 } : { bottom: keyboardHeight }),
      backgroundColor: color.background.card,
      paddingTop: 10,
      paddingBottom: Math.max(insets.bottom, 8),
    }),
    [isKeyboardOpen, keyboardHeight, color.background.card, insets.bottom],
  );

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: 20,
      paddingBottom: bottomPadding,
      flexGrow: 1,
    }),
    [bottomPadding],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      topInset={TOP_INSET}
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="none"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={{
        backgroundColor: color.background.card,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color.icon.muted,
      }}
    >
      <BottomSheetView style={contentContainerStyle}>
        <Animated.View
          style={[{ flex: 1 }, contentAnimatedStyle]}
          pointerEvents={isKeyboardOpen ? 'none' : 'auto'}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={Boolean(answer)}
          >
            <View style={{ flex: 1 }}>{renderContent()}</View>
          </ScrollView>
        </Animated.View>
        {inputRow && <View style={inputContainerStyle}>{inputRow}</View>}
      </BottomSheetView>
    </BottomSheetModal>
  );
};
