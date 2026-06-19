import { ArrowRight, MessageSquare, X } from 'lucide-react-native';
import React, { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight, iosHitSlopForVisualSize } from '@/shared/lib';
import {
  FLOATING_FROSTED_ACCESSORY_BUTTON_SIZE,
  FLOATING_FROSTED_INPUT_ICON_SIZE,
  FLOATING_FROSTED_INPUT_ICON_STROKE,
  FloatingFrostedChromeDivider,
  FloatingFrostedChromeSection,
  FloatingFrostedInputChrome,
  FloatingFrostedStickyView,
  getFloatingFrostedInputContainerStyle,
  getFloatingFrostedInputFieldRowStyle,
  getFloatingFrostedInputRowStyle,
  getInputFieldInputStyle,
} from '@/shared/ui';

type AskAIComposerProps = {
  color: Colors;
  safeAreaBottom: number;
  contentMaxWidth: number | undefined;
  questionInput: string;
  onChangeQuestion: (text: string) => void;
  onSubmit: () => void;
  canSend: boolean;
  disableByNetwork: boolean;
};

const SEND_BUTTON_SIZE = FLOATING_FROSTED_ACCESSORY_BUTTON_SIZE;

const AskAIComposerInner = ({
  color,
  safeAreaBottom,
  contentMaxWidth,
  questionInput,
  onChangeQuestion,
  onSubmit,
  canSend,
  disableByNetwork,
}: AskAIComposerProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const hasInputText = questionInput.length > 0;
  const isActive = focused || hasInputText;

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeQuestion(text.replace(/\n/g, ' '));
    },
    [onChangeQuestion],
  );

  const handleClear = useCallback(() => {
    onChangeQuestion('');
    inputRef.current?.focus();
  }, [onChangeQuestion]);

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
              ...getFloatingFrostedInputContainerStyle(),
              ...getFloatingFrostedInputRowStyle(),
            }}
          >
            <View style={getFloatingFrostedInputFieldRowStyle()}>
              <MessageSquare
                size={FLOATING_FROSTED_INPUT_ICON_SIZE}
                color={isActive ? color.accent.primary : color.icon.muted}
                strokeWidth={FLOATING_FROSTED_INPUT_ICON_STROKE}
              />
              <TextInput
                ref={inputRef}
                style={[getInputFieldInputStyle(color), { flex: 1 }]}
                placeholder={t('recordingDetail.askPlaceholder')}
                placeholderTextColor={color.text.secondary}
                accessibilityLabel={t('recordingDetail.askPlaceholder')}
                value={questionInput}
                onChangeText={handleChangeText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="send"
                submitBehavior="submit"
                editable={!disableByNetwork}
                onSubmitEditing={handleSend}
              />
              {hasInputText ? (
                <TouchableOpacity
                  onPress={handleClear}
                  hitSlop={iosHitSlopForVisualSize(16, 16)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.clear')}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: color.icon.muted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={10} color={color.background.primary} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
            <FloatingFrostedChromeDivider color={color} />
            <FloatingFrostedChromeSection>
              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('recordingDetail.askSend')}
                accessibilityState={{ disabled: !canSend }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={{
                  width: SEND_BUTTON_SIZE,
                  height: SEND_BUTTON_SIZE,
                  borderRadius: SEND_BUTTON_SIZE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canSend ? color.accent.primary : color.background.tertiary,
                }}
              >
                <ArrowRight
                  size={17}
                  color={canSend ? color.icon.onAccent : color.text.muted}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </FloatingFrostedChromeSection>
          </View>
        </FloatingFrostedInputChrome>
      </View>
    </FloatingFrostedStickyView>
  );
};

export const AskAIComposer = memo(AskAIComposerInner);
