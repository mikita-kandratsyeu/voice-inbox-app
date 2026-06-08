import { MenuView } from '@react-native-menu/menu';
import { ChevronLeft, MessageSquare, MoreVertical, Share } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { HeaderIconButton, PrivateExecutionBadge } from '@/shared/ui';

type RecordingDetailHeaderProps = {
  record: VoiceRecord;
  color: Colors;
  isPrivateMode?: boolean;
  headerTitleOpacity: SharedValue<number>;
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
  headerTitleOpacity,
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
  const headerBackgroundColor = isPrivateMode
    ? color.background.primary
    : color.background.secondary;
  const isArchived = record.status === 'archived';
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: headerTitleOpacity.value,
  }));

  return (
    <View
      className="flex-row items-center px-4 pb-3"
      style={{ backgroundColor: headerBackgroundColor, paddingTop: insets.top + 12 }}
    >
      <HeaderIconButton
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
      {isPrivateMode ? <PrivateExecutionBadge color={color} compact /> : null}
      <View className="min-w-0 flex-1 pl-3 pr-2" pointerEvents="none">
        <Animated.Text
          className="text-left text-[15px] font-semibold"
          style={[headerTitleStyle, { color: color.text.primary }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {record.title}
        </Animated.Text>
      </View>
      <View className="shrink-0 flex-row items-center gap-2">
        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<Share size={18} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onShare}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          containerStyle={iconBtnBg}
          accessibilityLabel={t('share.share')}
        />
        <HeaderIconButton
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
            if (nativeEvent.event === 'togglePin') onTogglePin();
            if (nativeEvent.event === 'rename') onRename();
            if (nativeEvent.event === 'moveToFolder') onMoveToFolder();
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
              id: 'togglePin',
              title: record.isPinned ? t('recordActions.unpin') : t('recordActions.pin'),
              image: 'pin',
              imageColor: record.isPinned ? color.accent.pin : color.text.primary,
              titleColor: color.text.primary,
            },
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
          <HeaderIconButton
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
