import { Archive, ArchiveRestore, FolderInput, Share, Trash2, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BATCH_ACTION_BAR_HOME_GAP,
  BATCH_ACTION_BAR_ROW_HEIGHT,
  getFloatingTabBarScrollPaddingBottom,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { hapticLight, hapticMedium, useIsTablet } from '@/shared/lib';
import {
  FloatingFrostedChrome,
  FloatingFrostedChromeDivider,
  HeaderIconButton,
} from '@/shared/ui';

type BatchActionBarProps = {
  count: number;
  color: Colors;
  showUnarchive?: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  /** Long-press on trash: permanent delete (skip Trash). */
  onDeleteLongPress?: () => void;
  onExport: () => void;
  /** Batch export / extended share — Pro only; when false the export control is hidden. */
  showExport?: boolean;
  onMoveToFolder: () => void;
  hideMoveToFolder?: boolean;
  onCancel: () => void;
  dockToScreenBottom?: boolean;
};

type ActionButtonProps = {
  icon: (iconColor: string) => React.ReactNode;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
  disabled?: boolean;
  destructive?: boolean;
  color: Colors;
};

const ActionButton = ({
  icon,
  label,
  onPress,
  onLongPress,
  accessibilityHint,
  disabled = false,
  destructive = false,
  color,
}: ActionButtonProps) => {
  const activeColor = destructive ? color.accent.delete : color.text.primary;
  const resolvedColor = disabled ? color.text.muted : activeColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={{ alignItems: 'center', gap: 4, minWidth: 52, opacity: disabled ? 0.4 : 1 }}
    >
      {icon(resolvedColor)}
      <Text style={{ fontSize: 10, fontWeight: '500', color: resolvedColor }}>{label}</Text>
    </TouchableOpacity>
  );
};

export const BatchActionBar = ({
  count,
  color,
  showUnarchive = false,
  onArchive,
  onUnarchive,
  onDelete,
  onDeleteLongPress,
  onExport,
  showExport = true,
  onMoveToFolder,
  hideMoveToFolder = false,
  onCancel,
  dockToScreenBottom = false,
}: BatchActionBarProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  const disabled = count === 0;

  const chromeInsetsBottom = dockToScreenBottom
    ? Math.max(insets.bottom, 8) + BATCH_ACTION_BAR_HOME_GAP
    : getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet) + 8;

  const handleCancel = () => {
    hapticLight();
    onCancel();
  };

  const handleArchive = () => {
    hapticMedium();
    onArchive();
  };

  const handleUnarchive = () => {
    hapticMedium();
    onUnarchive();
  };

  const handleDelete = () => {
    hapticMedium();
    onDelete();
  };

  const handleDeleteLongPress = () => {
    if (!onDeleteLongPress || disabled) return;
    hapticMedium();
    onDeleteLongPress();
  };

  const handleExport = () => {
    hapticLight();
    onExport();
  };

  const handleMoveToFolder = () => {
    hapticMedium();
    onMoveToFolder();
  };

  const chrome = (
    <FloatingFrostedChrome
      color={color}
      insetsBottom={chromeInsetsBottom}
      contentStyle={{
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          minHeight: BATCH_ACTION_BAR_ROW_HEIGHT,
        }}
      >
        <View style={{ justifyContent: 'center' }}>
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<X size={22} color={color.text.secondary} strokeWidth={2.2} />}
            color={color}
            onPress={handleCancel}
            accessibilityLabel={t('common.cancel')}
          />
        </View>
        <FloatingFrostedChromeDivider color={color} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            paddingLeft: 8,
          }}
          style={{ flex: 1, minWidth: 0 }}
        >
          {!hideMoveToFolder && (
            <ActionButton
              icon={(c) => <FolderInput size={20} strokeWidth={2} color={c} />}
              label={t('batch.moveToFolder')}
              onPress={handleMoveToFolder}
              disabled={disabled}
              color={color}
            />
          )}
          {showUnarchive ? (
            <ActionButton
              icon={(c) => <ArchiveRestore size={20} strokeWidth={2} color={c} />}
              label={t('batch.unarchive')}
              onPress={handleUnarchive}
              disabled={disabled}
              color={color}
            />
          ) : (
            <ActionButton
              icon={(c) => <Archive size={20} strokeWidth={2} color={c} />}
              label={t('batch.archive')}
              onPress={handleArchive}
              disabled={disabled}
              color={color}
            />
          )}
          {showExport ? (
            <ActionButton
              icon={(c) => <Share size={20} strokeWidth={2} color={c} />}
              label={t('batch.export')}
              onPress={handleExport}
              disabled={disabled}
              color={color}
            />
          ) : null}
          <ActionButton
            icon={(c) => <Trash2 size={20} strokeWidth={2} color={c} />}
            label={t('batch.delete')}
            onPress={handleDelete}
            onLongPress={onDeleteLongPress ? handleDeleteLongPress : undefined}
            accessibilityHint={onDeleteLongPress ? t('batch.deleteLongPressHint') : undefined}
            disabled={disabled}
            destructive
            color={color}
          />
        </ScrollView>
      </View>
    </FloatingFrostedChrome>
  );

  if (dockToScreenBottom) {
    return (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
        }}
      >
        {chrome}
      </View>
    );
  }

  return chrome;
};
