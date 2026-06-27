import { ArrowRight } from 'lucide-react-native';
import React, { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight, iosHitSlopForVisualSize } from '@/shared/lib';
import {
  FLOATING_FROSTED_INPUT_HORIZONTAL_PAD,
  FloatingFrostedInputChrome,
  FloatingFrostedStickyView,
  getInputFieldInputStyle,
} from '@/shared/ui';

import { AskAiModelChipMenu } from './AskAiModelChipMenu';

type AskAIComposerProps = {
  color: Colors;
  safeAreaBottom: number;
  contentMaxWidth: number | undefined;
  questionInput: string;
  onChangeQuestion: (text: string) => void;
  onSubmit: () => void;
  canSend: boolean;
  disableByNetwork: boolean;
  /** Extra chips rendered next to the model picker (e.g. inbox corpus scope). */
  extraChips?: React.ReactNode;
  placeholderKey?: string;
  sendA11yKey?: string;
};

const SEND_BUTTON_SIZE = 32;
const SEND_ICON_SIZE = 15;
const COMPOSER_TOP_PAD = 12;
const COMPOSER_BOTTOM_PAD = 10;
const COMPOSER_TOOLBAR_TOP_GAP = 8;

const AskAIComposerInner = ({
  color,
  safeAreaBottom,
  contentMaxWidth,
  questionInput,
  onChangeQuestion,
  onSubmit,
  canSend,
  disableByNetwork,
  extraChips,
  placeholderKey = 'recordingDetail.askPlaceholder',
  sendA11yKey = 'recordingDetail.askSend',
}: AskAIComposerProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeQuestion(text.replace(/\n/g, ' '));
    },
    [onChangeQuestion],
  );

  const handleSend = useCallback(() => {
    if (!canSend) return;
    hapticLight();
    onSubmit();
  }, [canSend, onSubmit]);

  return (
    <FloatingFrostedStickyView safeAreaBottom={safeAreaBottom}>
      <View
        style={{
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth ?? '100%',
          backgroundColor: 'transparent',
        }}
      >
        <FloatingFrostedInputChrome color={color}>
          <View
            style={{
              paddingHorizontal: FLOATING_FROSTED_INPUT_HORIZONTAL_PAD,
              paddingTop: COMPOSER_TOP_PAD,
            }}
          >
            <View style={{ minHeight: 24 }}>
              <TextInput
                ref={inputRef}
                style={getInputFieldInputStyle(color)}
                placeholder={t(placeholderKey)}
                placeholderTextColor={color.text.secondary}
                accessibilityLabel={t(placeholderKey)}
                value={questionInput}
                onChangeText={handleChangeText}
                returnKeyType="send"
                submitBehavior="submit"
                editable={!disableByNetwork}
                onSubmitEditing={handleSend}
                selectionColor={color.accent.primary}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingTop: COMPOSER_TOOLBAR_TOP_GAP,
                paddingBottom: COMPOSER_BOTTOM_PAD,
              }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AskAiModelChipMenu color={color} />
                {extraChips}
              </View>
              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t(sendA11yKey)}
                accessibilityState={{ disabled: !canSend }}
                hitSlop={iosHitSlopForVisualSize(SEND_BUTTON_SIZE, SEND_BUTTON_SIZE)}
                style={{
                  width: SEND_BUTTON_SIZE,
                  height: SEND_BUTTON_SIZE,
                  borderRadius: SEND_BUTTON_SIZE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canSend ? color.accent.primary : color.background.tertiary,
                  flexShrink: 0,
                }}
              >
                <ArrowRight
                  size={SEND_ICON_SIZE}
                  color={canSend ? color.icon.onAccent : color.text.muted}
                  strokeWidth={2.4}
                />
              </TouchableOpacity>
            </View>
          </View>
        </FloatingFrostedInputChrome>
      </View>
    </FloatingFrostedStickyView>
  );
};

export const AskAIComposer = memo(AskAIComposerInner);
