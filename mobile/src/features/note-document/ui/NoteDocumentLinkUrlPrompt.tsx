import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Colors } from '@/shared/config';
import { IS_ANDROID } from '@/shared/lib';
import { getInputFieldInputStyle, SheetFooterButtons } from '@/shared/ui';

type NoteDocumentLinkUrlPromptProps = {
  visible: boolean;
  color: Colors;
  onCancel: () => void;
  onSubmit: (url: string) => void;
};

export function NoteDocumentLinkUrlPrompt({
  visible,
  color,
  onCancel,
  onSubmit,
}: NoteDocumentLinkUrlPromptProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (visible) {
      setUrl('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable
        className="flex-1 justify-end"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingHorizontal: 16,
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
        onPress={onCancel}
      >
        <Pressable
          className="overflow-hidden rounded-2xl"
          style={{
            backgroundColor: color.background.primary,
            borderWidth: 1,
            borderColor: color.border.default,
          }}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, gap: 8 }}>
            <Text
              className="text-[20px] font-bold leading-7"
              style={{
                color: color.text.primary,
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
            >
              {t('recordingDetail.document.linkPrompt.title')}
            </Text>
            <Text
              className="text-[15px] leading-[22px]"
              style={{
                color: color.text.secondary,
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
            >
              {t('recordingDetail.document.linkPrompt.message')}
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder={t('recordingDetail.document.linkPrompt.placeholder')}
              placeholderTextColor={color.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={() => onSubmit(url)}
              style={[
                getInputFieldInputStyle(color),
                {
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: color.border.default,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: color.background.secondary,
                },
              ]}
              accessibilityLabel={t('recordingDetail.document.linkPrompt.placeholder')}
            />
          </View>
          <View className="px-5 pb-5 pt-2">
            <SheetFooterButtons
              color={color}
              primaryLabel={t('recordingDetail.document.linkPrompt.insert')}
              onPrimaryPress={() => onSubmit(url)}
              secondaryLabel={t('common.cancel')}
              onSecondaryPress={onCancel}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
