import { Archive, ArchiveRestore, FolderInput, Share, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BATCH_ACTION_BAR_HOME_GAP,
  BATCH_ACTION_BAR_PADDING_TOP,
  BATCH_ACTION_BAR_ROW_HEIGHT,
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
  getBatchActionBarHeight,
  getFloatingTabBarScrollPaddingBottom,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { hapticLight, hapticMedium, useIsTablet, withAlphaHex } from '@/shared/lib';
import { Button, FrostedChromeBackground } from '@/shared/ui';

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
  dockToScreenBottom?: boolean;
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
  dockToScreenBottom = false,
}: BatchActionBarProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const slideDistance = dockToScreenBottom ? getBatchActionBarHeight(insets.bottom) : 120;
  const slideAnim = useRef(new Animated.Value(slideDistance)).current;

  useEffect(() => {
    slideAnim.setValue(slideDistance);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim, slideDistance]);

  const disabled = count === 0;

  const bottomPad = dockToScreenBottom
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
        ...(dockToScreenBottom
          ? {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }
          : { position: 'relative' }),
        backgroundColor: 'transparent',
        overflow: 'visible',
        shadowColor: color.shadow.color,
        shadowOffset: { width: 0, height: -FLOAT_TAB_IOS_SHADOW_OFFSET_Y },
        shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
        shadowRadius: FLOAT_TAB_IOS_SHADOW_RADIUS,
        elevation: 8,
      }}
    >
      <FrostedChromeBackground />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: withAlphaHex(color.border.default, 0.45),
        }}
      />
      <View
        style={{
          paddingBottom: bottomPad,
          paddingTop: BATCH_ACTION_BAR_PADDING_TOP,
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: BATCH_ACTION_BAR_ROW_HEIGHT,
          }}
        >
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<X size={22} color={color.text.secondary} strokeWidth={2.2} />}
            color={color}
            onPress={handleCancel}
            accessibilityLabel={t('common.cancel')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
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
              icon={(c) => <Share size={20} strokeWidth={2} color={c} />}
              label={t('batch.export')}
              onPress={handleExport}
              disabled={disabled}
              color={color}
            />
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
      </View>
    </Animated.View>
  );
};
