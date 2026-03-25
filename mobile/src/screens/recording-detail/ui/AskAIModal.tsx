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
  Cloud,
  Copy,
  MessageSquare,
  RefreshCw,
  Send,
  Share2,
  WifiOff,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Keyboard,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
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
};
const ErrorState = ({ color, onRetry, onClose }: ErrorStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-4 py-8">
      <AlertCircle size={40} color={color.accent.delete} strokeWidth={1.8} />
      <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.askError')}
      </Text>
      <Text className="text-center text-sm" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askErrorContinueHint')}
      </Text>
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
}: AnswerContentProps) => {
  const { t } = useTranslation();
  const shareText = `${answer}\n\n— ${record.title}`;

  return (
    <View className="gap-4 pb-4">
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
      <View
        className="mb-1 h-[48px] w-[48px] items-center justify-center rounded-full"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <MessageSquare size={22} color={color.icon.muted} strokeWidth={1.8} />
      </View>
      <Text className="text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.askEmptyTitle')}
      </Text>
      <Text className="text-sm" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askEmptyDesc')}
      </Text>
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
  const { askQuestion, reset, askAnother, isLoading, error, question, answer, history } =
    useAskAI();
  const { isConnected } = useNetworkStatus();
  const hasTranscript = Boolean(record.transcript);

  useEffect(() => {
    if (!visible) return;
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
    }
  }, [visible, reset]);

  useEffect(() => {
    if (!visible) return;
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      bottomSheetRef.current?.snapToIndex(1);
    });
    return () => sub.remove();
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
    handleSuggestedQuestion,
    handleCopy,
    handleShare,
    askAnother,
  ]);

  const bottomPadding = useMemo(() => Math.max(insets.bottom, 8) + 8, [insets.bottom]);

  const sendButton = useMemo(
    () => (
      <View style={{ flexShrink: 0, paddingBottom: 4 }}>
        <Button
          variant="primary"
          size="md"
          icon={<Send size={18} color="#fff" strokeWidth={2.5} />}
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

  const inputRow = hasTranscript && (
    <View style={{ marginTop: 8, flexShrink: 0 }}>
      <InputField
        color={color}
        hasValue={Boolean(questionInput.trim())}
        multiline
        rightElement={sendButton}
      >
        <BottomSheetTextInput
          style={[getInputFieldInputStyle(color, true), { maxHeight: 100 }]}
          placeholder={t('recordingDetail.askPlaceholder')}
          placeholderTextColor={color.text.secondary}
          accessibilityLabel={t('recordingDetail.askPlaceholder')}
          value={questionInput}
          onChangeText={setQuestionInput}
          returnKeyType="send"
          editable={isConnected !== false}
          multiline
          numberOfLines={3}
          submitBehavior="blurAndSubmit"
          onSubmitEditing={handleAsk}
        />
      </InputField>
    </View>
  );

  const usageFooter = hasTranscript && aiUsage && (
    <View className="mt-2 flex-row justify-center py-2">
      <Text className="text-xs" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askUsage', { used: aiUsage.used, limit: aiUsage.limit })}
      </Text>
    </View>
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
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={Boolean(answer)}
          bottomOffset={16}
        >
          <View style={{ flex: 1 }}>{renderContent()}</View>
          {inputRow}
          {usageFooter}
        </KeyboardAwareScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
