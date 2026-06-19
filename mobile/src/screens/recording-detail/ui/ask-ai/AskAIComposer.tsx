import React, { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import type { Colors } from '@/shared/config';
import {
  FloatingFrostedChrome,
  FloatingFrostedChromeDivider,
  FloatingFrostedChromeSection,
  getInputFieldInputStyle,
} from '@/shared/ui';

type AskAIComposerProps = {
  color: Colors;
  insetsBottom: number;
  contentMaxWidth: number | undefined;
  questionInput: string;
  onChangeQuestion: (text: string) => void;
  onSubmit: () => void;
  disableByNetwork: boolean;
  sendButton: ReactNode;
};

const AskAIComposerInner = ({
  color,
  insetsBottom,
  contentMaxWidth,
  questionInput,
  onChangeQuestion,
  onSubmit,
  disableByNetwork,
  sendButton,
}: AskAIComposerProps) => {
  const { t } = useTranslation();
  const hasInputText = questionInput.length > 0;

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={{ alignSelf: 'stretch' }}>
      <View
        style={{
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth ?? '100%',
        }}
      >
        <FloatingFrostedChrome color={color} insetsBottom={insetsBottom}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'stretch',
              minHeight: 44,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 0,
                flexDirection: 'row',
                alignItems: hasInputText ? 'flex-start' : 'center',
              }}
            >
              <TextInput
                style={[
                  getInputFieldInputStyle(color, hasInputText),
                  { flex: 1 },
                  hasInputText ? { maxHeight: 100 } : undefined,
                ]}
                placeholder={t('recordingDetail.askPlaceholder')}
                placeholderTextColor={color.text.secondary}
                accessibilityLabel={t('recordingDetail.askPlaceholder')}
                value={questionInput}
                onChangeText={onChangeQuestion}
                returnKeyType="send"
                submitBehavior="submit"
                editable={!disableByNetwork}
                multiline={hasInputText}
                scrollEnabled={hasInputText}
                onSubmitEditing={onSubmit}
              />
            </View>
            <FloatingFrostedChromeDivider color={color} />
            <FloatingFrostedChromeSection>{sendButton}</FloatingFrostedChromeSection>
          </View>
        </FloatingFrostedChrome>
      </View>
    </KeyboardStickyView>
  );
};

export const AskAIComposer = memo(AskAIComposerInner);
