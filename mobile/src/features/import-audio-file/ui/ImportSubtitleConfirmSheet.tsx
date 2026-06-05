import type { BottomSheetBackdropProps, BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { UsersRound } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, Text, View } from 'react-native';

import { useProEntitlement } from '@/features/pro-license';
import { useColors } from '@/shared/config';
import { formatTime, hapticLight, hapticSuccess } from '@/shared/lib';
import {
  APP_BOTTOM_SHEET_BACKDROP_SNAP,
  AppBottomSheetModal,
  SheetFooterButtons,
  useBottomSheetContentPadding,
} from '@/shared/ui';

export type ImportFileConfirmOptions = {
  title: string;
  isMeetingMode: boolean;
};

type ImportSubtitleConfirmSheetProps = {
  visible: boolean;
  kind?: 'audio' | 'subtitles';
  defaultTitle: string;
  durationMs: number;
  onConfirm: (options: ImportFileConfirmOptions) => void | Promise<void>;
  onCancel: () => void;
};

export function ImportSubtitleConfirmSheet({
  visible,
  kind = 'subtitles',
  defaultTitle,
  durationMs,
  onConfirm,
  onCancel,
}: ImportSubtitleConfirmSheetProps) {
  const { t } = useTranslation();
  const c = useColors();
  const { isProActive } = useProEntitlement();
  const contentPadding = useBottomSheetContentPadding(24);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const skipNextDismissRef = useRef(false);
  const [title, setTitle] = useState(defaultTitle);
  const [isMeetingMode, setIsMeetingMode] = useState(false);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        {...APP_BOTTOM_SHEET_BACKDROP_SNAP}
        pressBehavior="close"
        opacity={0.35}
      />
    ),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    setTitle(defaultTitle);
    setIsMeetingMode(false);
  }, [visible, defaultTitle]);

  const handleDismiss = useCallback(() => {
    if (skipNextDismissRef.current) {
      skipNextDismissRef.current = false;
      return;
    }
    onCancel();
  }, [onCancel]);

  const handleCancel = useCallback(() => {
    skipNextDismissRef.current = true;
    onCancel();
    bottomSheetRef.current?.dismiss();
  }, [onCancel]);

  const handleConfirm = useCallback(async () => {
    const resolvedTitle = title.trim() || defaultTitle.trim();
    await onConfirm({ title: resolvedTitle, isMeetingMode });
    hapticSuccess();
    skipNextDismissRef.current = true;
    bottomSheetRef.current?.dismiss();
  }, [title, defaultTitle, isMeetingMode, onConfirm]);

  const handleToggleMeetingMode = useCallback(() => {
    hapticLight();
    setIsMeetingMode((value) => !value);
  }, []);

  const durationSec = Math.max(1, Math.floor(durationMs / 1000));

  return (
    <AppBottomSheetModal
      ref={bottomSheetRef}
      visible={visible}
      onClose={handleDismiss}
      surface="card"
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: c.text.muted }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 4,
          ...contentPadding,
          gap: 12,
        }}
      >
        <Text className="text-lg font-bold" style={{ color: c.text.primary }}>
          {t(kind === 'audio' ? 'importAudio.audioImportTitle' : 'importAudio.subtitleImportTitle')}
        </Text>

        <BottomSheetTextInput
          className="rounded-xl border-2 px-4 py-3 text-[16px]"
          style={{
            borderColor: c.accent.primary,
            color: c.text.primary,
            backgroundColor: c.background.tertiary,
          }}
          placeholder={defaultTitle}
          placeholderTextColor={c.text.muted}
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
          accessibilityLabel={t('record.titlePlaceholder')}
          accessibilityHint={t('record.titleInputHint')}
        />

        <Text className="-mt-1 text-[13px]" style={{ color: c.text.secondary }}>
          {t(
            kind === 'audio'
              ? 'importAudio.audioImportDuration'
              : 'importAudio.subtitleImportDuration',
            { time: formatTime(durationSec) },
          )}
        </Text>

        {isProActive ? (
          <View
            className="flex-row items-center gap-3 rounded-xl border-2 px-3.5 py-3"
            style={{
              borderColor: isMeetingMode ? c.accent.primary : 'transparent',
              backgroundColor: c.background.tertiary,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('record.meetingMode')}
              onPress={handleToggleMeetingMode}
              className="min-w-0 flex-1 flex-row items-center gap-3"
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isMeetingMode ? c.accent.primary : c.background.secondary,
                }}
              >
                <UsersRound
                  size={18}
                  color={isMeetingMode ? '#fff' : c.text.secondary}
                  strokeWidth={2}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-semibold" style={{ color: c.text.primary }}>
                  {t('record.meetingMode')}
                </Text>
                <Text className="mt-0.5 text-[13px] leading-5" style={{ color: c.text.secondary }}>
                  {t('record.meetingModeHint')}
                </Text>
              </View>
            </Pressable>
            <Switch
              value={isMeetingMode}
              onValueChange={handleToggleMeetingMode}
              accessibilityLabel={t('record.meetingMode')}
              style={{ alignSelf: 'center', transform: [{ translateY: 2 }] }}
              trackColor={{
                false: c.background.secondary,
                true: c.accent.primary,
              }}
              thumbColor={c.icon.onAccent}
              ios_backgroundColor={c.background.secondary}
            />
          </View>
        ) : null}

        <SheetFooterButtons
          className="mt-1 w-full"
          color={c}
          primaryLabel={t('importAudio.importConfirm')}
          onPrimaryPress={handleConfirm}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={handleCancel}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
