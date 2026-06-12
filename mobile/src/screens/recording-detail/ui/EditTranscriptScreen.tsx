import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import {
  shouldUseTranscriptSegmentView,
  stripDocumentTranscriptMarkup,
  useRecordStore,
} from '@/entities/record';
import { useEditTranscript } from '@/features/edit-transcript';
import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { HeaderIconButton, ScreenHeader } from '@/shared/ui';

import { EditTranscriptSegmentInput } from './EditTranscriptSegmentInput';

export const EditTranscriptScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditTranscript'>>();
  const insets = useSafeAreaInsets();
  const color = useColors();

  const { record } = route.params;
  const records = useRecordStore((s) => s.records);
  const hydrateRecordDetails = useRecordStore((s) => s.hydrateRecordDetails);
  const liveRecord = records.find((r) => r.id === record.id) ?? record;
  const hasAudio = Boolean(liveRecord.audioPath?.trim());
  const rawSegments = useMemo(() => {
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

  const useSegmentView = shouldUseTranscriptSegmentView(rawSegments, hasAudio);

  const segments = useMemo(() => {
    if (useSegmentView) return rawSegments;
    return rawSegments.map((segment) => ({
      ...segment,
      text: stripDocumentTranscriptMarkup(segment.text),
    }));
  }, [rawSegments, useSegmentView]);

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
        title={t('recordingDetail.editTranscript')}
        onBack={handleBack}
        dismissKeyboardOnPress
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
          paddingBottom: insets.bottom + 24,
        }}
        keyboardDismissMode={IS_IOS ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        disableScrollOnKeyboardHide
        showsVerticalScrollIndicator
        bottomOffset={16}
      >
        {editedSegments.map((seg) => (
          <View key={seg.id} className="mb-4 flex-row gap-2">
            {useSegmentView ? (
              <Text
                className="mt-2 min-w-8 text-xs font-semibold"
                style={{ color: color.accent.primary }}
              >
                {seg.startTime}
              </Text>
            ) : null}
            <EditTranscriptSegmentInput
              color={color}
              value={seg.text}
              onChangeText={(text) => updateSegmentText(seg.id, text)}
              editable={!isSaving}
              accessibilityLabel={
                useSegmentView
                  ? `${t('recordingDetail.transcript')}, ${seg.startTime}`
                  : t('recordingDetail.text')
              }
            />
          </View>
        ))}
      </KeyboardAwareScrollView>
    </View>
  );
};
