import { MenuView } from '@react-native-menu/menu';
import { ChevronLeft, MessageSquare, MoreVertical, NotepadText } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';
import { HeaderIconButton, PrivateExecutionBadge } from '@/shared/ui';

type RecordingDetailHeaderProps = {
  record: VoiceRecord;
  color: Colors;
  isPrivateMode?: boolean;
  headerTitleOpacity: SharedValue<number>;
  onBack: () => void;
  onTogglePin: () => void;
  onShare: () => void;
  onOpenDocument: () => void;
  isOpeningDocument?: boolean;
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
  onOpenDocument,
  isOpeningDocument = false,
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

  const menuActions = useMemo(() => {
    const titleColor = color.text.primary;
    const showAllTasks = Boolean(onOpenAllTasksForNote && !isArchived);

    const showPin = !isArchived;

    const togglePinAction: NativeMenuAction = {
      id: 'togglePin',
      title: record.isPinned ? t('recordActions.unpin') : t('recordActions.pin'),
      image: 'pin',
      imageColor: record.isPinned ? color.accent.pin : titleColor,
      titleColor,
    };

    const renameAction: NativeMenuAction = {
      id: 'rename',
      title: t('recordActions.rename'),
      image: 'pencil',
      imageColor: titleColor,
      titleColor,
    };

    const moveToFolderAction: NativeMenuAction = {
      id: 'moveToFolder',
      title: t('folders.moveToFolderMenu'),
      image: 'folder',
      imageColor: titleColor,
      titleColor,
    };

    const archiveAction: NativeMenuAction = isArchived
      ? {
          id: 'unarchive',
          title: t('recordActions.unarchive'),
          image: 'arrow.uturn.backward',
          imageColor: titleColor,
          titleColor,
        }
      : {
          id: 'archive',
          title: t('recordActions.archive'),
          image: 'archivebox',
          imageColor: titleColor,
          titleColor,
        };

    const shareAction: NativeMenuAction = {
      id: 'share',
      title: t('share.share'),
      image: 'square.and.arrow.up',
      imageColor: titleColor,
      titleColor,
    };

    const actions: NativeMenuAction[] = [];

    if (showAllTasks) {
      actions.push({
        id: 'allTasksForNote',
        title: t('recordingDetail.allTasksForNote'),
        image: 'checklist',
        imageColor: titleColor,
        titleColor,
      });
      const pinRenameSection = showPin ? [togglePinAction, renameAction] : [renameAction];
      actions.push(inlineNativeMenuSection('pinAndRenameSection', titleColor, pinRenameSection));
    } else if (showPin) {
      actions.push(togglePinAction, renameAction);
    } else {
      actions.push(renameAction);
    }

    actions.push(
      inlineNativeMenuSection(
        'folderAndArchiveSection',
        titleColor,
        !isPrivateMode
          ? [moveToFolderAction, archiveAction, shareAction]
          : [archiveAction, shareAction],
      ),
    );
    actions.push(
      inlineNativeMenuSection('deleteSection', titleColor, [
        {
          id: 'delete',
          title: t('recordActions.delete'),
          image: 'trash',
          imageColor: color.accent.delete,
          titleColor: color.accent.delete,
          attributes: { destructive: true },
        },
      ]),
    );

    return actions;
  }, [
    color.accent.delete,
    color.accent.pin,
    color.text.primary,
    isArchived,
    isPrivateMode,
    onOpenAllTasksForNote,
    record.isPinned,
    t,
  ]);

  return (
    <View
      className="flex-row items-center px-4 pb-3"
      style={{ backgroundColor: headerBackgroundColor, paddingTop: insets.top + 12 }}
    >
      <View className="shrink-0 flex-row items-center gap-3">
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
      </View>
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
          icon={
            isOpeningDocument ? (
              <ActivityIndicator size="small" color={color.text.primary} />
            ) : (
              <NotepadText size={18} color={color.text.primary} strokeWidth={2.2} />
            )
          }
          color={color}
          onPress={onOpenDocument}
          disabled={isOpeningDocument}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          containerStyle={iconBtnBg}
          accessibilityLabel={t('recordingDetail.document.openA11y')}
          accessibilityState={{ disabled: isOpeningDocument, busy: isOpeningDocument }}
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
            if (nativeEvent.event === 'share') onShare();
            if (nativeEvent.event === 'delete') onDelete();
            if (nativeEvent.event === 'allTasksForNote') onOpenAllTasksForNote?.();
          }}
          actions={menuActions}
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
