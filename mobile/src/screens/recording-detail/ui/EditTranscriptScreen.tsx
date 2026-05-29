import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import { useEditTranscript } from '@/features/edit-transcript';
import { useColors } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';
import { getInputFieldInputStyle, HeaderIconButton, ScreenHeader } from '@/shared/ui';

export const EditTranscriptScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditTranscript'>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const isTablet = useIsTablet();

  const { record } = route.params;
  const records = useRecordStore((s) => s.records);
  const hydrateRecordDetails = useRecordStore((s) => s.hydrateRecordDetails);
  const liveRecord = records.find((r) => r.id === record.id) ?? record;
  const hasAudio = Boolean(liveRecord.audioPath?.trim());
  const segments = useMemo(() => {
    if ((liveRecord.transcriptSegments?.length ?? 0) > 0) {
      return liveRecord.transcriptSegments ?? [];
    }
    if (liveRecord.transcript.trim()) {
      return [
        {
          id: `${liveRecord.id}-text`,
          startTime: '00:00',
          startMs: 0,
          endMs: liveRecord.durationMs ?? 0,
          text: liveRecord.transcript.trim(),
        },
      ];
    }
    return [];
  }, [liveRecord.id, liveRecord.transcript, liveRecord.transcriptSegments, liveRecord.durationMs]);

  useEffect(() => {
    if (!liveRecord.detailsHydrated) {
      void hydrateRecordDetails(record.id);
    }
  }, [hydrateRecordDetails, liveRecord.detailsHydrated, record.id]);

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
      <ScreenHeader
        title={t('recordingDetail.editTranscriptTitle')}
        onBack={handleBack}
        rightSlot={
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
            color={color}
            onPress={handleSave}
            disabled={isSaving || !hasChanges()}
            accessibilityLabel={t('common.save')}
            accessibilityState={{ disabled: isSaving || !hasChanges() }}
          />
        }
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 16,
          paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bottomOffset={16}
      >
        {editedSegments.map((seg) => (
          <View key={seg.id} className="mb-4 flex-row gap-2">
            {hasAudio && (
              <Text
                className="mt-2 min-w-8 text-xs font-semibold"
                style={{ color: color.accent.primary }}
              >
                {seg.startTime}
              </Text>
            )}
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
              accessibilityLabel={
                hasAudio
                  ? `${t('recordingDetail.transcript')}, ${seg.startTime}`
                  : t('recordingDetail.text')
              }
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
