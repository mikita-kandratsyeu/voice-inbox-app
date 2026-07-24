import { ArrowDownUp, Plus } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import {
  folderChipActiveForeground,
  hapticSelection,
  isDarkSurfaceColor,
  resolveDisplayFolderColor,
  withAlphaHex,
} from '@/shared/lib';
import {
  FILTER_CHIP_ICON_SIZE,
  FILTER_CHIP_LABEL_STYLE,
  FILTER_CHIP_SCROLL_CONTENT_EMBEDDED_STYLE,
  FILTER_CHIP_SCROLL_CONTENT_STYLE,
  filterChipRowStyle,
} from '@/shared/ui/filterChipMetrics';

import { FolderLucideIcon } from '../lib/folderLucideIcons';
import type { Folder } from '../model/types';

type FolderChipBarProps = {
  folders: Folder[];
  activeFolderId: string | null;
  color: Colors;
  onSelect: (id: string | null) => void;
  onCreatePress: () => void;
  onEditPress: (folder: Folder) => void;
  /** Shown when there are at least 2 folders — opens reorder bottom sheet. */
  onReorderPress?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  /** Nested inside another filter panel — no outer chrome. */
  variant?: 'standalone' | 'embedded';
  /** i18n key for the reset chip label. @default folders.all */
  allChipLabelKey?: string;
};

type AllChipProps = {
  label: string;
  isActive: boolean;
  color: Colors;
  onPress: () => void;
};

const AllChip = ({ label, isActive, color, onPress }: AllChipProps) => {
  const backgroundColor = isActive ? color.accent.primary : color.background.tertiary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={filterChipRowStyle(backgroundColor)}
    >
      <Text
        style={{
          ...FILTER_CHIP_LABEL_STYLE,
          color: isActive ? color.icon.onAccent : color.text.primary,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

type FolderChipProps = {
  folder: Folder;
  isActive: boolean;
  color: Colors;
  surfaceDark: boolean;
  isProActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

const FolderChip = ({
  folder,
  isActive,
  color,
  surfaceDark,
  isProActive,
  onPress,
  onLongPress,
}: FolderChipProps) => {
  const folderHex = resolveDisplayFolderColor(folder.color, isProActive);
  const inactiveTint = surfaceDark ? 0.22 : 0.14;
  const inactiveBorder = surfaceDark ? 0.5 : 0.42;
  const activeFg = folderChipActiveForeground(color, folderHex);

  const backgroundColor = isActive ? folderHex : withAlphaHex(folderHex, inactiveTint);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={folder.name}
      accessibilityState={{ selected: isActive }}
      style={filterChipRowStyle(
        backgroundColor,
        isActive ? folderHex : withAlphaHex(folderHex, inactiveBorder),
      )}
    >
      {folder.icon ? (
        <FolderLucideIcon
          iconId={folder.icon}
          size={FILTER_CHIP_ICON_SIZE}
          color={isActive ? activeFg : folderHex}
          strokeWidth={2}
        />
      ) : null}
      <Text
        style={{
          ...FILTER_CHIP_LABEL_STYLE,
          color: isActive ? activeFg : color.text.primary,
        }}
        numberOfLines={1}
      >
        {folder.name}
      </Text>
    </TouchableOpacity>
  );
};

export const FolderChipBar = ({
  folders,
  activeFolderId,
  color,
  onSelect,
  onCreatePress,
  onEditPress,
  onReorderPress,
  scrollRef,
  variant = 'standalone',
  allChipLabelKey = 'folders.all',
}: FolderChipBarProps) => {
  const { t } = useTranslation();
  const { isProActive } = useProEntitlement();
  const surfaceDark = isDarkSurfaceColor(color);
  const showReorder = Boolean(onReorderPress) && folders.length >= 2;

  const handleAllPress = useCallback(() => {
    hapticSelection();
    onSelect(null);
  }, [onSelect]);

  const isEmbedded = variant === 'embedded';

  return (
    <View
      style={
        isEmbedded
          ? undefined
          : {
              backgroundColor: color.background.primary,
              borderBottomWidth: 1,
              borderBottomColor: color.border.default,
            }
      }
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          isEmbedded ? FILTER_CHIP_SCROLL_CONTENT_EMBEDDED_STYLE : FILTER_CHIP_SCROLL_CONTENT_STYLE
        }
      >
        <AllChip
          label={t(allChipLabelKey)}
          isActive={activeFolderId === null}
          color={color}
          onPress={handleAllPress}
        />
        {folders.map((folder) => (
          <FolderChip
            key={folder.id}
            folder={folder}
            isActive={activeFolderId === folder.id}
            color={color}
            surfaceDark={surfaceDark}
            isProActive={isProActive}
            onPress={() => {
              hapticSelection();
              onSelect(folder.id);
            }}
            onLongPress={() => onEditPress(folder)}
          />
        ))}
        {showReorder && (
          <Pressable
            onPress={onReorderPress}
            accessibilityRole="button"
            accessibilityLabel={t('folders.reorderOpenA11y')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: color.background.tertiary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ArrowDownUp size={16} color={color.text.secondary} strokeWidth={2.2} />
          </Pressable>
        )}
        <Pressable
          onPress={onCreatePress}
          accessibilityRole="button"
          accessibilityLabel={t('folders.create')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: color.background.tertiary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Plus size={16} color={color.text.secondary} strokeWidth={2.5} />
        </Pressable>
      </ScrollView>
    </View>
  );
};
