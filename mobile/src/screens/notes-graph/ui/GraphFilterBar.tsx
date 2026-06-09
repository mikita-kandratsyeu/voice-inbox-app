import { Folder as FolderIcon, LayoutGrid, Tag as TagIcon } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { type Folder, FolderPickerSheet } from '@/entities/folder';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import {
  folderChipActiveForeground,
  hapticSelection,
  resolveDisplayFolderColor,
  withAlphaHex,
} from '@/shared/lib';
import {
  FILTER_CHIP_ICON_SIZE,
  FILTER_CHIP_LABEL_STYLE,
  FILTER_CHIP_SCROLL_CONTENT_STYLE,
  filterChipRowStyle,
} from '@/shared/ui/filterChipMetrics';

import type { GraphEdgeVisibility, GraphFilters } from '../lib/graphTypes';
import { GraphLayoutModeSheet } from './GraphLayoutModeSheet';
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

type ChipTone = {
  backgroundColor: string;
  borderColor: string;
  foregroundColor: string;
};

function pickerChipTone(color: Colors, emphasized: boolean, isDark: boolean): ChipTone {
  if (emphasized) {
    const fillAlpha = isDark ? 0.2 : 0.12;
    const borderAlpha = isDark ? 0.48 : 0.34;
    return {
      backgroundColor: withAlphaHex(color.accent.primary, fillAlpha),
      borderColor: withAlphaHex(color.accent.primary, borderAlpha),
      foregroundColor: color.accent.primary,
    };
  }

  return {
    backgroundColor: color.background.card,
    borderColor: color.border.default,
    foregroundColor: color.text.primary,
  };
}

function toggleChipTone(color: Colors, active: boolean, isDark: boolean): ChipTone {
  if (active) {
    const fillAlpha = isDark ? 0.22 : 0.14;
    const borderAlpha = isDark ? 0.46 : 0.32;
    return {
      backgroundColor: withAlphaHex(color.accent.primary, fillAlpha),
      borderColor: withAlphaHex(color.accent.primary, borderAlpha),
      foregroundColor: color.accent.primary,
    };
  }

  return {
    backgroundColor: color.background.tertiary,
    borderColor: color.background.tertiary,
    foregroundColor: color.text.secondary,
  };
}

type SelectorChipProps = {
  label: string;
  icon: React.ReactNode;
  tone: ChipTone;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
};

function SelectorChip({
  label,
  icon,
  tone,
  disabled = false,
  selected = false,
  onPress,
}: SelectorChipProps) {
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
      accessibilityState={{ selected, disabled }}
      style={[
        filterChipRowStyle(tone.backgroundColor, tone.borderColor),
        disabled ? { opacity: 0.45 } : null,
      ]}
    >
      {icon}
      <Text
        style={{
          ...FILTER_CHIP_LABEL_STYLE,
          color: tone.foregroundColor,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type ToggleChipProps = {
  label: string;
  active: boolean;
  color: Colors;
  isDark: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function ToggleChip({ label, active, color, isDark, disabled = false, onPress }: ToggleChipProps) {
  const tone = toggleChipTone(color, active, isDark);

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
      style={[
        filterChipRowStyle(tone.backgroundColor, tone.borderColor),
        disabled ? { opacity: 0.45 } : null,
      ]}
    >
      <Text
        style={{
          ...FILTER_CHIP_LABEL_STYLE,
          color: tone.foregroundColor,
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
  const isDark = useAppTheme() === 'dark';
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);
  const [layoutModePickerVisible, setLayoutModePickerVisible] = useState(false);

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

  const tagsSelected = filters.tags.length > 0;
  const tagsChipLabel = tagsSelected
    ? t('notesGraph.filters.tagsCount', { count: filters.tags.length })
    : t('notesGraph.filters.pickTags');

  const layoutChipTone = pickerChipTone(color, false, isDark);
  const tagsChipTone = pickerChipTone(color, tagsSelected, isDark);

  const folderChipTone: ChipTone = activeFolder
    ? {
        backgroundColor: folderChipColor!,
        borderColor: folderChipColor!,
        foregroundColor: activeFolderForeground,
      }
    : pickerChipTone(color, false, isDark);

  const pickerIconColor = (tone: ChipTone) =>
    tone.foregroundColor === color.text.primary ? color.text.secondary : tone.foregroundColor;

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
        <SelectorChip
          label={t(`notesGraph.filters.layoutMode.${filters.layoutMode}`)}
          tone={layoutChipTone}
          disabled={disabled}
          onPress={() => setLayoutModePickerVisible(true)}
          icon={
            <LayoutGrid
              size={FILTER_CHIP_ICON_SIZE}
              color={pickerIconColor(layoutChipTone)}
              strokeWidth={2}
            />
          }
        />

        {foldersEnabled ? (
          <SelectorChip
            label={activeFolder?.name ?? t('notesGraph.filters.allFolders')}
            tone={folderChipTone}
            disabled={disabled}
            selected={activeFolder != null}
            onPress={() => setFolderPickerVisible(true)}
            icon={
              activeFolder ? (
                <FolderLucideIcon
                  iconId={activeFolder.icon}
                  size={FILTER_CHIP_ICON_SIZE}
                  color={folderChipTone.foregroundColor}
                  strokeWidth={2}
                />
              ) : (
                <FolderIcon
                  size={FILTER_CHIP_ICON_SIZE}
                  color={pickerIconColor(folderChipTone)}
                  strokeWidth={2}
                />
              )
            }
          />
        ) : null}

        {availableTags.length > 0 ? (
          <SelectorChip
            label={tagsChipLabel}
            tone={tagsChipTone}
            disabled={disabled}
            selected={tagsSelected}
            onPress={() => setTagPickerVisible(true)}
            icon={
              <TagIcon
                size={FILTER_CHIP_ICON_SIZE}
                color={pickerIconColor(tagsChipTone)}
                strokeWidth={2}
              />
            }
          />
        ) : null}

        <ToggleChip
          label={t('notesGraph.filters.showTasks')}
          active={filters.showTasks}
          color={color}
          isDark={isDark}
          disabled={disabled}
          onPress={() => onFiltersChange({ showTasks: !filters.showTasks })}
        />

        <ToggleChip
          label={t('notesGraph.filters.similar')}
          active={filters.edgeVisibility.similar}
          color={color}
          isDark={isDark}
          disabled={disabled}
          onPress={() => toggleEdge('similar')}
        />

        <ToggleChip
          label={t('notesGraph.filters.tags')}
          active={filters.edgeVisibility.sharedTag}
          color={color}
          isDark={isDark}
          disabled={disabled}
          onPress={() => toggleEdge('sharedTag')}
        />

        <ToggleChip
          label={t('notesGraph.filters.folders')}
          active={filters.edgeVisibility.sameFolder}
          color={color}
          isDark={isDark}
          disabled={disabled}
          onPress={() => toggleEdge('sameFolder')}
        />
      </ScrollView>

      <GraphLayoutModeSheet
        visible={layoutModePickerVisible}
        selectedMode={filters.layoutMode}
        onClose={() => setLayoutModePickerVisible(false)}
        onSelect={(layoutMode) => {
          onFiltersChange({ layoutMode });
          setLayoutModePickerVisible(false);
        }}
      />

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
