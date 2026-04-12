import { MenuView } from '@react-native-menu/menu';
import { ChevronLeft, MessageSquare, MoreVertical, Pin } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { Button, PrivateModeBadge } from '@/shared/ui';

type RecordingDetailHeaderProps = {
  record: VoiceRecord;
  color: Colors;
  isPrivateMode?: boolean;
  onBack: () => void;
  onTogglePin: () => void;
  onShare: () => void;
  onAskAI: () => void;
  onRename: () => void;
  onMoveToFolder: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onOpenAllTasksForNote?: () => void;
};

export const RecordingDetailHeader = ({
  record,
  color,
  isPrivateMode = false,
  onBack,
  onTogglePin,
  onShare,
  onAskAI,
  onRename,
  onMoveToFolder,
  onArchive,
  onUnarchive,
  onDelete,
  onOpenAllTasksForNote,
}: RecordingDetailHeaderProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const iconBtnBg = { backgroundColor: color.background.tertiary };
  const pinActiveStyle = { backgroundColor: color.accent.primary + '1A' };
  const headerBackgroundColor = isPrivateMode
    ? color.background.primary
    : color.background.secondary;
  const isArchived = record.status === 'archived';

  return (
    <View
      className="flex-row items-center justify-between px-4 pb-3"
      style={{ backgroundColor: headerBackgroundColor, paddingTop: insets.top + 12 }}
    >
      <View className="flex-row items-center gap-2">
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<ChevronLeft size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.goBack')}
        />
        {isPrivateMode && <PrivateModeBadge color={color} compact />}
      </View>
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
          accessibilityLabel={record.isPinned ? t('recordActions.unpin') : t('recordActions.pin')}
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
          accessibilityLabel={t('recordingDetail.askButton')}
        />
        <MenuView
          key={theme}
          title=""
          themeVariant={isDark ? 'dark' : 'light'}
          shouldOpenOnLongPress={false}
          onPressAction={({ nativeEvent }) => {
            if (nativeEvent.event === 'rename') onRename();
            if (nativeEvent.event === 'moveToFolder') onMoveToFolder();
            if (nativeEvent.event === 'share') onShare();
            if (nativeEvent.event === 'archive') onArchive();
            if (nativeEvent.event === 'unarchive') onUnarchive();
            if (nativeEvent.event === 'delete') onDelete();
            if (nativeEvent.event === 'allTasksForNote') onOpenAllTasksForNote?.();
          }}
          actions={[
            ...(onOpenAllTasksForNote && !isArchived
              ? [
                  {
                    id: 'allTasksForNote' as const,
                    title: t('recordingDetail.allTasksForNote'),
                    image: 'checklist' as const,
                    imageColor: color.text.primary,
                    titleColor: color.text.primary,
                  },
                ]
              : []),
            {
              id: 'rename',
              title: t('recordActions.rename'),
              image: 'pencil',
              imageColor: color.text.primary,
              titleColor: color.text.primary,
            },
            ...(!isPrivateMode
              ? [
                  {
                    id: 'moveToFolder' as const,
                    title: t('folders.moveToFolderMenu'),
                    image: 'folder' as const,
                    imageColor: color.text.primary,
                    titleColor: color.text.primary,
                  },
                ]
              : []),
            {
              id: 'share',
              title: t('share.share'),
              image: 'square.and.arrow.up',
              imageColor: color.text.primary,
              titleColor: color.text.primary,
            },
            isArchived
              ? {
                  id: 'unarchive' as const,
                  title: t('recordActions.unarchive'),
                  image: 'arrow.uturn.backward' as const,
                  imageColor: color.text.primary,
                  titleColor: color.text.primary,
                }
              : {
                  id: 'archive' as const,
                  title: t('recordActions.archive'),
                  image: 'archivebox' as const,
                  imageColor: color.text.primary,
                  titleColor: color.text.primary,
                },
            {
              id: 'delete',
              title: t('recordActions.delete'),
              image: 'trash',
              imageColor: color.accent.delete,
              titleColor: color.accent.delete,
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
            onPress={() => {}}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('common.moreActions')}
          />
        </MenuView>
      </View>
    </View>
  );
};
