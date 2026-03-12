import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TranscriptSegment } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { getInputFieldInputStyle } from '@/shared/ui';
import { Button } from '@/shared/ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_POINTS = [Math.min(SCREEN_HEIGHT * 0.6, 400), SCREEN_HEIGHT * 0.9];

type EditTranscriptBottomSheetProps = {
  visible: boolean;
  segments: TranscriptSegment[];
  color: Colors;
  isSaving: boolean;
  hasChanges: boolean;
  onSegmentChange: (segmentId: string, text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDismiss: () => void;
};

export const EditTranscriptBottomSheet = ({
  visible,
  segments,
  color,
  isSaving,
  hasChanges,
  onSegmentChange,
  onSave,
  onCancel,
  onDismiss,
}: EditTranscriptBottomSheetProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

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

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleCancel = useCallback(() => {
    onCancel();
    bottomSheetRef.current?.dismiss();
  }, [onCancel]);

  const handleSave = useCallback(async () => {
    await onSave();
    bottomSheetRef.current?.dismiss();
  }, [onSave]);

  const bottomPadding = Math.max(insets.bottom, 16) + 8;

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
          paddingHorizontal: 16,
          paddingBottom: bottomPadding,
        }}
      >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {segments.map((seg) => (
            <View key={seg.id} className="mb-3 flex-row gap-2.5">
              <Text
                className="mt-2 min-w-9 text-xs font-semibold"
                style={{ color: color.accent.primary }}
              >
                {seg.startTime}
              </Text>
              <BottomSheetTextInput
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
                onChangeText={(text) => onSegmentChange(seg.id, text)}
                multiline
                editable={!isSaving}
              />
            </View>
          ))}
        </BottomSheetScrollView>
        <View className="flex-row gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={<X size={16} color={color.text.primary} strokeWidth={2} />}
            label={t('common.cancel')}
            color={color}
            onPress={handleCancel}
            disabled={isSaving}
            className="flex-1"
          />
          <Button
            variant="primary"
            size="md"
            icon={<Check size={16} color="#fff" strokeWidth={2.5} />}
            label={t('common.save')}
            color={color}
            onPress={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1"
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
