import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, ChevronLeft } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import { useEditTranscript } from '@/features/edit-transcript';
import { getColors, useAppTheme } from '@/shared/config';
import { getInputFieldInputStyle } from '@/shared/ui';
import { Button } from '@/shared/ui';

export const EditTranscriptScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditTranscript'>>();
  const insets = useSafeAreaInsets();
  const color = getColors(useAppTheme());

  const { record } = route.params;
  const records = useRecordStore((s) => s.records);
  const liveRecord = records.find((r) => r.id === record.id) ?? record;
  const segments = liveRecord.transcriptSegments ?? [];

  const { editedSegments, updateSegmentText, save, reset, hasChanges, isSaving } =
    useEditTranscript({
      recordId: record.id,
      segments,
    });

  const handleBack = useCallback(() => {
    KeyboardController.dismiss({ animated: false });
    reset();
    navigation.goBack();
  }, [navigation, reset]);

  const handleSave = useCallback(async () => {
    KeyboardController.dismiss({ animated: false });
    await save();
    navigation.goBack();
  }, [navigation, save]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        KeyboardController.dismiss({ animated: false });
      };
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
      <View
        className="flex-row items-center justify-between border-b px-4 py-3"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          backgroundColor: color.background.secondary,
          borderBottomColor: color.border.default,
        }}
      >
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<ChevronLeft size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={handleBack}
        />
        <Text
          className="flex-1 text-center text-lg font-semibold"
          style={{ color: color.text.primary }}
        >
          {t('recordingDetail.editTranscriptTitle')}
        </Text>
        <View style={{ width: 44, alignItems: 'flex-end' }}>
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
            color={color}
            onPress={handleSave}
            disabled={isSaving || !hasChanges()}
          />
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bottomOffset={16}
      >
        {editedSegments.map((seg) => (
          <View key={seg.id} className="mb-4 flex-row gap-2">
            <Text
              className="mt-2 min-w-8 text-xs font-semibold"
              style={{ color: color.accent.primary }}
            >
              {seg.startTime}
            </Text>
            <TextInput
              className="flex-1 rounded-xl border-2 px-3 py-2.5 text-sm"
              style={[
                getInputFieldInputStyle(color, true),
                {
                  color: color.text.primary,
                  minHeight: 44,
                  borderColor: color.border.default,
                  backgroundColor: color.background.tertiary,
                },
              ]}
              placeholderTextColor={color.text.secondary}
              value={seg.text}
              onChangeText={(text) => updateSegmentText(seg.id, text)}
              multiline
              editable={!isSaving}
            />
          </View>
        ))}
      </KeyboardAwareScrollView>
    </View>
  );
};
