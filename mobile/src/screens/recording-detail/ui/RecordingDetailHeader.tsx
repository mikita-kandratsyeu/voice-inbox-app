import { MenuView } from '@react-native-menu/menu';
import { ChevronLeft, MessageSquare, MoreVertical, Pin, Share2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { getColors, useAppTheme } from '@/shared/config';
import { Button } from '@/shared/ui';

type RecordingDetailHeaderProps = {
  record: VoiceRecord;
  color: Colors;
  onBack: () => void;
  onTogglePin: () => void;
  onShare: () => void;
  onShareAudio: () => void;
  onAskAI: () => void;
  onRename: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
};

export const RecordingDetailHeader = ({
  record,
  color,
  onBack,
  onTogglePin,
  onShare,
  onShareAudio,
  onAskAI,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
}: RecordingDetailHeaderProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const themeColors = getColors(theme);
  const isDark = theme === 'dark';
  const iconBtnBg = { backgroundColor: color.background.tertiary };
  const pinActiveStyle = { backgroundColor: color.accent.primary + '1A' };

  return (
    <View
      className="flex-row items-center justify-between px-4 pb-3"
      style={{ backgroundColor: color.background.secondary, paddingTop: insets.top + 12 }}
    >
      <Button
        iconOnly
        variant="icon"
        size="md"
        icon={<ChevronLeft size={22} color={color.text.primary} strokeWidth={2.2} />}
        color={color}
        onPress={onBack}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      />
      <View className="flex-row items-center gap-2">
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={
            <Pin
              size={18}
              color={record.isPinned ? color.accent.pin : color.text.primary}
              strokeWidth={2.2}
              fill={record.isPinned ? color.accent.pin : 'transparent'}
            />
          }
          color={color}
          onPress={onTogglePin}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          containerStyle={record.isPinned ? pinActiveStyle : iconBtnBg}
        />
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<Share2 size={18} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onShare}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<MessageSquare size={18} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onAskAI}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
        <MenuView
          key={theme}
          title=""
          themeVariant={isDark ? 'dark' : 'light'}
          shouldOpenOnLongPress={false}
          onPressAction={({ nativeEvent }) => {
            if (nativeEvent.event === 'rename') onRename();
            if (nativeEvent.event === 'shareAudio') onShareAudio();
            if (nativeEvent.event === 'archive') onArchive();
            if (nativeEvent.event === 'unarchive') onUnarchive();
            if (nativeEvent.event === 'delete') onDelete();
          }}
          actions={[
            {
              id: 'rename',
              title: t('recordActions.rename'),
              image: 'pencil',
              imageColor: themeColors.text.primary,
              titleColor: themeColors.text.primary,
            },
            ...(record.audioPath
              ? [
                  {
                    id: 'shareAudio' as const,
                    title: t('share.shareAudio'),
                    image: 'square.and.arrow.up' as const,
                    imageColor: themeColors.text.primary,
                    titleColor: themeColors.text.primary,
                  },
                ]
              : []),
            record.status === 'archived'
              ? {
                  id: 'unarchive' as const,
                  title: t('recordActions.unarchive'),
                  image: 'arrow.uturn.backward' as const,
                  imageColor: themeColors.text.primary,
                  titleColor: themeColors.text.primary,
                }
              : {
                  id: 'archive' as const,
                  title: t('recordActions.archive'),
                  image: 'archivebox' as const,
                  imageColor: themeColors.text.primary,
                  titleColor: themeColors.text.primary,
                },
            {
              id: 'delete',
              title: t('recordActions.delete'),
              image: 'trash',
              imageColor: themeColors.accent.delete,
              titleColor: themeColors.accent.delete,
              attributes: { destructive: true },
            },
          ]}
        >
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<MoreVertical size={18} color={color.text.primary} strokeWidth={2.2} />}
            color={color}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        </MenuView>
      </View>
    </View>
  );
};
