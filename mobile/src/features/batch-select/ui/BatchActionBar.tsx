import { Archive, ArchiveRestore, FolderInput, Share2, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { hapticLight, hapticMedium, useIsTablet } from '@/shared/lib';

type BatchActionBarProps = {
  count: number;
  color: Colors;
  showUnarchive?: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onExport: () => void;
  onMoveToFolder: () => void;
  hideMoveToFolder?: boolean;
  onCancel: () => void;
};

type ActionButtonProps = {
  icon: (iconColor: string) => React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  color: Colors;
};

const ActionButton = ({
  icon,
  label,
  onPress,
  disabled = false,
  destructive = false,
  color,
}: ActionButtonProps) => {
  const activeColor = destructive ? color.accent.delete : color.text.primary;
  const resolvedColor = disabled ? color.text.muted : activeColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
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
  onExport,
  onMoveToFolder,
  hideMoveToFolder = false,
  onCancel,
}: BatchActionBarProps) => {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(120)).current;
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  const disabled = count === 0;

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

  const handleExport = () => {
    hapticLight();
    onExport();
  };

  const handleMoveToFolder = () => {
    hapticMedium();
    onMoveToFolder();
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        backgroundColor: color.background.primary,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
        paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet) + 8,
        paddingTop: 20,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={handleCancel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: color.background.tertiary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} color={color.text.secondary} strokeWidth={2.5} />
        </TouchableOpacity>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 8,
          }}
          style={{ flexGrow: 0, maxWidth: '82%' }}
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
          <ActionButton
            icon={(c) => <Share2 size={20} strokeWidth={2} color={c} />}
            label={t('batch.export')}
            onPress={handleExport}
            disabled={disabled}
            color={color}
          />
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
          <ActionButton
            icon={(c) => <Trash2 size={20} strokeWidth={2} color={c} />}
            label={t('batch.delete')}
            onPress={handleDelete}
            disabled={disabled}
            destructive
            color={color}
          />
        </ScrollView>
      </View>
    </Animated.View>
  );
};
