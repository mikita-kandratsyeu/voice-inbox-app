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
};

type AllChipProps = {
  label: string;
  isActive: boolean;
  color: Colors;
  onPress: () => void;
};

const AllChip = ({ label, isActive, color, onPress }: AllChipProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: isActive }}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isActive ? color.accent.primary : color.background.tertiary,
      marginRight: 8,
      gap: 4,
    }}
  >
    <Text
      style={{
        fontSize: 13,
        fontWeight: '500',
        color: isActive ? color.icon.onAccent : color.text.primary,
      }}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

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

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={folder.name}
      accessibilityState={{ selected: isActive }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        gap: 4,
        backgroundColor: isActive ? folderHex : withAlphaHex(folderHex, inactiveTint),
        borderWidth: isActive ? 0 : 1,
        borderColor: withAlphaHex(folderHex, inactiveBorder),
      }}
    >
      {folder.icon ? (
        <FolderLucideIcon
          iconId={folder.icon}
          size={14}
          color={isActive ? activeFg : folderHex}
          strokeWidth={2}
        />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
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
}: FolderChipBarProps) => {
  const { t } = useTranslation();
  const { isProActive } = useProEntitlement();
  const surfaceDark = isDarkSurfaceColor(color);
  const showReorder = Boolean(onReorderPress) && folders.length >= 2;

  const handleAllPress = useCallback(() => {
    hapticSelection();
    onSelect(null);
  }, [onSelect]);

  return (
    <View
      style={{
        backgroundColor: color.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}
      >
        <AllChip
          label={t('folders.all')}
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
        {showReorder ? (
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
        ) : null}
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
