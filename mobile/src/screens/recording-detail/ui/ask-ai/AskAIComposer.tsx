import React, { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import type { Colors } from '@/shared/config';
import { FrostedBottomChrome, getInputFieldInputStyle, InputField } from '@/shared/ui';

type AskAIComposerProps = {
  color: Colors;
  insetsBottom: number;
  isTablet: boolean;
  questionInput: string;
  onChangeQuestion: (text: string) => void;
  onSubmit: () => void;
  canSend: boolean;
  disableByNetwork: boolean;
  sendButton: ReactNode;
};

const AskAIComposerInner = ({
  color,
  insetsBottom,
  isTablet,
  questionInput,
  onChangeQuestion,
  onSubmit,
  disableByNetwork,
  sendButton,
}: AskAIComposerProps) => {
  const { t } = useTranslation();
  const hasInputText = questionInput.trim().length > 0;

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={{ alignSelf: 'stretch' }}>
      <FrostedBottomChrome
        color={color}
        insetsBottom={insetsBottom}
        contentStyle={{
          paddingHorizontal: isTablet ? 80 : 16,
          paddingTop: 16,
          paddingBottom: insetsBottom,
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
            onChangeText={onChangeQuestion}
            returnKeyType="send"
            editable={!disableByNetwork}
            multiline
            numberOfLines={1}
            onSubmitEditing={onSubmit}
          />
        </InputField>
      </FrostedBottomChrome>
    </KeyboardStickyView>
  );
};

export const AskAIComposer = memo(AskAIComposerInner);
