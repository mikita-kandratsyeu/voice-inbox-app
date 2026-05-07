import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { FileText, ListChecks, Music } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ShareBriefTemplate } from '@/features/share-record';
import { useColors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib/platform';

type ShareRecordSheetProps = {
  visible: boolean;
  hasAudio: boolean;
  onClose: () => void;
  onShareText: (template: ShareBriefTemplate) => void;
  onShareAudio: () => void;
};

export const ShareRecordSheet = ({
  visible,
  hasAudio,
  onClose,
  onShareText,
  onShareAudio,
}: ShareRecordSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }
    ref.current?.dismiss();
    return undefined;
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const handleShareNoteBrief = useCallback(() => {
    onClose();
    onShareText('noteBrief');
  }, [onClose, onShareText]);

  const handleShareMeetingBrief = useCallback(() => {
    onClose();
    onShareText('meetingBrief');
  }, [onClose, onShareText]);

  const handleShareAudio = useCallback(() => {
    onClose();
    onShareAudio();
  }, [onClose, onShareAudio]);

  const renderOption = ({
    icon,
    title,
    description,
    onPress,
    disabled = false,
    accessibilityLabel,
  }: {
    icon: ReactNode;
    title: string;
    description?: string;
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: color.background.tertiary,
        gap: 10,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>{title}</Text>
        {description ? (
          <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>{description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: color.background.primary,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color.icon.muted,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 20),
          gap: 10,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: color.text.primary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {t('share.shareAsTitle')}
        </Text>

        {renderOption({
          icon: <FileText size={20} color={color.text.primary} strokeWidth={2.1} />,
          title: t('share.noteBrief'),
          description: t('share.noteBriefDescription'),
          accessibilityLabel: t('share.noteBrief'),
          onPress: handleShareNoteBrief,
        })}

        {renderOption({
          icon: <ListChecks size={20} color={color.text.primary} strokeWidth={2.1} />,
          title: t('share.meetingBrief'),
          description: t('share.meetingBriefDescription'),
          accessibilityLabel: t('share.meetingBrief'),
          onPress: handleShareMeetingBrief,
        })}

        {renderOption({
          icon: <Music size={20} color={color.text.primary} strokeWidth={2.1} />,
          title: t('share.shareAudio'),
          description: hasAudio ? undefined : t('share.noAudio'),
          accessibilityLabel: t('share.shareAudio'),
          disabled: !hasAudio,
          onPress: handleShareAudio,
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
};
