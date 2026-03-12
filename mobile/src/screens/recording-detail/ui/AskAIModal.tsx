import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { AlertCircle, Cloud, MessageSquare, RefreshCw, Send, WifiOff } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_POINTS = [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 0.75];

import type { VoiceRecord } from '@/entities/record';
import { AI_MODELS, useSettingsStore } from '@/entities/settings';
import { useAskAI } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';
import { useNetworkStatus } from '@/shared/lib';
import { Button, getInputFieldInputStyle, InputField } from '@/shared/ui';

type AskAIModalProps = {
  visible: boolean;
  record: VoiceRecord;
  color: Colors;
  onDismiss?: () => void;
};

export const AskAIModal = ({ visible, record, color, onDismiss }: AskAIModalProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [questionInput, setQuestionInput] = useState('');
  const { askQuestion, reset, isLoading, error, question, answer } = useAskAI();
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
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

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  const handleAsk = useCallback(() => {
    const q = questionInput.trim();
    if (!q || !hasTranscript || isLoading || isConnected === false) return;
    askQuestion(record, q);
  }, [questionInput, hasTranscript, isLoading, isConnected, record, askQuestion]);

  const handleRetry = useCallback(() => {
    if (question) askQuestion(record, question);
  }, [question, record, askQuestion]);

  const renderContent = () => {
    if (!hasTranscript) {
      return (
        <View className="items-center gap-3 py-8">
          <View
            className="h-[56px] w-[56px] items-center justify-center rounded-full"
            style={{ backgroundColor: color.background.tertiary }}
          >
            <MessageSquare size={24} color={color.icon.muted} strokeWidth={1.8} />
          </View>
          <Text
            className="text-center text-base font-semibold"
            style={{ color: color.text.primary }}
          >
            {t('recordingDetail.noTranscriptForAi')}
          </Text>
          <Text className="text-center text-sm" style={{ color: color.text.secondary }}>
            {t('recordingDetail.noTranscriptForAiDesc')}
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View className="items-center gap-3 py-10">
          <ActivityIndicator color={color.accent.primary} size="large" />
          <Text className="text-sm" style={{ color: color.text.secondary }}>
            {t('recordingDetail.askProcessing')}
          </Text>
        </View>
      );
    }

    if (error && !answer) {
      return (
        <View className="items-center gap-4 py-8">
          <AlertCircle size={40} color={color.accent.delete} strokeWidth={1.8} />
          <Text
            className="text-center text-base font-semibold"
            style={{ color: color.text.primary }}
          >
            {t('recordingDetail.askError')}
          </Text>
          <Button
            variant="primary"
            size="lg"
            icon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
            label={t('recordingDetail.summaryRetry')}
            color={color}
            onPress={handleRetry}
          />
        </View>
      );
    }

    if (answer) {
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
    }

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

  const bottomPadding = Math.max(insets.bottom, 8) + 8;

  const sendButton = (
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
  );

  const inputRow = hasTranscript && (
    <View className="mt-2">
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

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      android_keyboardInputMode={Platform.OS === 'android' ? 'adjustResize' : undefined}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={{
        backgroundColor: color.background.card,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{ backgroundColor: color.text.muted }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingBottom: bottomPadding,
        }}
      >
        {answer ? (
          <BottomSheetScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{
              paddingBottom: 8,
              flexGrow: 1,
            }}
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
