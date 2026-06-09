import { Folder as FolderIcon } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { type Folder, FolderPickerSheet } from '@/entities/folder';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { Colors } from '@/shared/config';
import {
  folderChipActiveForeground,
  hapticSelection,
  resolveDisplayFolderColor,
} from '@/shared/lib';
import {
  FILTER_CHIP_ICON_SIZE,
  FILTER_CHIP_LABEL_STYLE,
  FILTER_CHIP_SCROLL_CONTENT_STYLE,
  filterChipRowStyle,
} from '@/shared/ui/filterChipMetrics';

import type { GraphEdgeVisibility, GraphFilters } from '../lib/graphTypes';
import { TagPickerSheet } from './TagPickerSheet';

type GraphFilterBarProps = {
  color: Colors;
  filters: GraphFilters;
  folders: Folder[];
  foldersEnabled: boolean;
  isProActive: boolean;
  availableTags: string[];
  disabled?: boolean;
  onFiltersChange: (patch: Partial<GraphFilters>) => void;
};

type ToggleChipProps = {
  label: string;
  active: boolean;
  color: Colors;
  disabled?: boolean;
  onPress: () => void;
};

function ToggleChip({ label, active, color, disabled = false, onPress }: ToggleChipProps) {
  const backgroundColor = active ? color.accent.primary : color.background.tertiary;

  return (
    <TouchableOpacity
      onPress={() => {
        if (disabled) return;
        hapticSelection();
        onPress();
      }}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      style={[filterChipRowStyle(backgroundColor), disabled ? { opacity: 0.45 } : null]}
    >
      <Text
        style={{
          ...FILTER_CHIP_LABEL_STYLE,
          color: active ? color.icon.onAccent : color.text.primary,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function GraphFilterBar({
  color,
  filters,
  folders,
  foldersEnabled,
  isProActive,
  availableTags,
  disabled = false,
  onFiltersChange,
}: GraphFilterBarProps) {
  const { t } = useTranslation();
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);

  const activeFolder = useMemo(
    () => (filters.folderId ? folders.find((f) => f.id === filters.folderId) : null),
    [filters.folderId, folders],
  );

  const folderChipColor = activeFolder
    ? resolveDisplayFolderColor(activeFolder.color, isProActive)
    : undefined;
  const activeFolderForeground = folderChipColor
    ? folderChipActiveForeground(color, folderChipColor)
    : color.text.primary;

  const allFoldersActive = filters.folderId === null;
  const folderChipBackground = activeFolder
    ? folderChipColor!
    : allFoldersActive
      ? color.accent.primary
      : color.background.tertiary;
  const folderChipBorder = activeFolder
    ? folderChipColor!
    : allFoldersActive
      ? color.accent.primary
      : color.background.tertiary;
  const folderChipForeground = activeFolder
    ? activeFolderForeground
    : allFoldersActive
      ? color.icon.onAccent
      : color.text.primary;

  const toggleEdge = (key: keyof GraphEdgeVisibility) => {
    if (disabled) return;
    onFiltersChange({
      edgeVisibility: {
        ...filters.edgeVisibility,
        [key]: !filters.edgeVisibility[key],
      },
    });
  };

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={{
        backgroundColor: color.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={FILTER_CHIP_SCROLL_CONTENT_STYLE}
      >
        {foldersEnabled ? (
          <TouchableOpacity
            onPress={() => {
              if (disabled) return;
              hapticSelection();
              setFolderPickerVisible(true);
            }}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={activeFolder?.name ?? t('notesGraph.filters.allFolders')}
            accessibilityState={{ selected: allFoldersActive || activeFolder != null }}
            style={filterChipRowStyle(folderChipBackground, folderChipBorder)}
          >
            {activeFolder ? (
              <FolderLucideIcon
                iconId={activeFolder.icon}
                size={FILTER_CHIP_ICON_SIZE}
                color={folderChipForeground}
                strokeWidth={2}
              />
            ) : (
              <FolderIcon
                size={FILTER_CHIP_ICON_SIZE}
                color={folderChipForeground}
                strokeWidth={2}
              />
            )}
            <Text
              style={{
                ...FILTER_CHIP_LABEL_STYLE,
                color: folderChipForeground,
              }}
              numberOfLines={1}
            >
              {activeFolder?.name ?? t('notesGraph.filters.allFolders')}
            </Text>
          </TouchableOpacity>
        ) : null}

        <ToggleChip
          label={t('notesGraph.filters.showTasks')}
          active={filters.showTasks}
          color={color}
          disabled={disabled}
          onPress={() => onFiltersChange({ showTasks: !filters.showTasks })}
        />

        <ToggleChip
          label={t('notesGraph.filters.similar')}
          active={filters.edgeVisibility.similar}
          color={color}
          disabled={disabled}
          onPress={() => toggleEdge('similar')}
        />

        <ToggleChip
          label={t('notesGraph.filters.tags')}
          active={filters.edgeVisibility.sharedTag}
          color={color}
          disabled={disabled}
          onPress={() => toggleEdge('sharedTag')}
        />

        <ToggleChip
          label={t('notesGraph.filters.folders')}
          active={filters.edgeVisibility.sameFolder}
          color={color}
          disabled={disabled}
          onPress={() => toggleEdge('sameFolder')}
        />

        {availableTags.length > 0 ? (
          <ToggleChip
            label={
              filters.tags.length > 0
                ? t('notesGraph.filters.tagsCount', { count: filters.tags.length })
                : t('notesGraph.filters.pickTags')
            }
            active={filters.tags.length > 0}
            color={color}
            disabled={disabled}
            onPress={() => setTagPickerVisible(true)}
          />
        ) : null}
      </ScrollView>

      <TagPickerSheet
        visible={tagPickerVisible}
        title={t('notesGraph.filters.tagPickerTitle')}
        tags={availableTags}
        selectedTags={filters.tags}
        onClose={() => setTagPickerVisible(false)}
        onApply={(tags) => onFiltersChange({ tags })}
      />

      {foldersEnabled ? (
        <FolderPickerSheet
          visible={folderPickerVisible}
          title={t('notesGraph.filters.folderPickerTitle')}
          folders={folders}
          currentFolderId={filters.folderId}
          inboxLabel={t('notesGraph.filters.allFolders')}
          onClose={() => setFolderPickerVisible(false)}
          onSelect={(folderId) => {
            onFiltersChange({ folderId });
            setFolderPickerVisible(false);
          }}
        />
      ) : null}
    </View>
  );
}
