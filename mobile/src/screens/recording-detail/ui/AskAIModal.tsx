import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { AlertCircle, Cloud, MessageSquare, RefreshCw, Send, WifiOff } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { AI_MODELS, useSettingsStore } from '@/entities/settings';
import { useAskAI } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';
import { hapticSelection, useNetworkStatus } from '@/shared/lib';
import { Button, getInputFieldInputStyle, InputField } from '@/shared/ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_POINTS = [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 0.75];
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
        />
        <Button
          variant="primary"
          size="lg"
          icon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
          label={t('recordingDetail.summaryRetry')}
          color={color}
          onPress={onRetry}
        />
      </View>
    </View>
  );
};

type AnswerContentProps = {
  color: Colors;
  question: string;
  answer: string;
};
const AnswerContent = ({ color, question, answer }: AnswerContentProps) => {
  const { t } = useTranslation();
  return (
    <View className="gap-4 pb-4">
      {question && (
        <View className="gap-1">
          <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
            {t('recordingDetail.ask')}
          </Text>
          <Text className="text-sm" style={{ color: color.text.primary }}>
            {question}
          </Text>
        </View>
      )}
      <View className="gap-1">
        <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
          {answer}
        </Text>
      </View>
    </View>
  );
};

type EmptyStateProps = {
  color: Colors;
  isConnected: boolean | null;
  onSuggestedQuestion: (question: string) => void;
  disabled?: boolean;
};
const EmptyState = ({ color, isConnected, onSuggestedQuestion, disabled }: EmptyStateProps) => {
  const { t } = useTranslation();
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
  const hintIcon =
    isConnected === false ? (
      <WifiOff size={12} color={color.accent.delete} strokeWidth={1.8} />
    ) : (
      <Cloud size={12} color={color.text.secondary} strokeWidth={1.8} />
    );

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
        {SUGGESTED_QUESTION_KEYS.map((key) => {
          const questionText = t(`recordingDetail.${key}`);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                hapticSelection();
                onSuggestedQuestion(questionText);
              }}
              disabled={disabled || isConnected === false}
              activeOpacity={0.7}
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <Text className="text-sm" style={{ color: color.text.primary }}>
                {questionText}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [questionInput, setQuestionInput] = useState('');
  const { askQuestion, reset, isLoading, error, question, answer } = useAskAI();
  const { isConnected } = useNetworkStatus();
  const hasTranscript = Boolean(record.transcript);

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
    if (answer) return <AnswerContent color={color} question={question ?? ''} answer={answer} />;
    return (
      <EmptyState
        color={color}
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
    color,
    isConnected,
    handleRetry,
    handleSuggestedQuestion,
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
        />
      </View>
    ),
    [color, handleAsk, questionInput, isLoading, isConnected],
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

  const keyboardBehavior = Platform.OS === 'ios' ? 'interactive' : 'extend';
  const contentContainerStyle = useMemo(
    () => ({
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: bottomPadding,
    }),
    [bottomPadding],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={SNAP_POINTS}
      topInset={TOP_INSET}
      enablePanDownToClose
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior="none"
      enableBlurKeyboardOnGesture
      android_keyboardInputMode={Platform.OS === 'android' ? 'adjustResize' : undefined}
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
        {answer ? (
          <BottomSheetScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator
            contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
          >
            {renderContent()}
          </BottomSheetScrollView>
        ) : (
          <View style={{ flex: 1 }}>{renderContent()}</View>
        )}
        {inputRow}
      </BottomSheetView>
    </BottomSheetModal>
  );
};
