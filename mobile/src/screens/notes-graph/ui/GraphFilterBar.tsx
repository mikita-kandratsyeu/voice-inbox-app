import { Folder as FolderIcon, Tag as TagIcon, Waypoints } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { type Folder } from '@/entities/folder';
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

import { getLayoutModeIconAccent } from '../lib/graphLayoutModeAccent';
import type { GraphFilters } from '../lib/graphTypes';
import { GraphConnectionsFilterSheet } from './GraphConnectionsFilterSheet';
import { GraphFolderPickerSheet } from './GraphFolderPickerSheet';
import { GraphLayoutModeIcon } from './GraphLayoutModeIcon';
import { GraphLayoutModeSheet } from './GraphLayoutModeSheet';
import { TagPickerSheet } from './TagPickerSheet';

const CONNECTION_FILTER_COUNT = 6;

function countActiveConnectionFilters(filters: GraphFilters): number {
  return (
    Number(filters.showTasks) +
    Number(filters.showCompletedTasks) +
    Number(filters.edgeVisibility.similar) +
    Number(filters.edgeVisibility.sharedTag) +
    Number(filters.edgeVisibility.sameFolder) +
    Number(filters.edgeVisibility.linked)
  );
}

type GraphFilterBarProps = {
  color: Colors;
  filters: GraphFilters;
  folders: Folder[];
  foldersEnabled: boolean;
  isLocalGraphMode?: boolean;
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

function pickerChipTone(
  color: Colors,
  emphasized: boolean,
  isDark: boolean,
  accentHex?: string,
): ChipTone {
  if (emphasized) {
    const accent = accentHex ?? color.accent.primary;
    const fillAlpha = isDark ? 0.2 : 0.12;
    const borderAlpha = isDark ? 0.48 : 0.34;
    return {
      backgroundColor: withAlphaHex(accent, fillAlpha),
      borderColor: withAlphaHex(accent, borderAlpha),
      foregroundColor: accent,
    };
  }

  return {
    backgroundColor: color.background.card,
    borderColor: color.border.default,
    foregroundColor: color.text.primary,
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

export function GraphFilterBar({
  color,
  filters,
  folders,
  foldersEnabled,
  isLocalGraphMode = false,
  isProActive,
  availableTags,
  disabled = false,
  onFiltersChange,
}: GraphFilterBarProps) {
  const { t } = useTranslation();
  const isDark = useAppTheme() === 'dark';
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);
  const [connectionsPickerVisible, setConnectionsPickerVisible] = useState(false);
  const [layoutModePickerVisible, setLayoutModePickerVisible] = useState(false);

  const selectedFolders = useMemo(
    () => folders.filter((folder) => filters.folderIds.includes(folder.id)),
    [filters.folderIds, folders],
  );

  const foldersSelected = selectedFolders.length > 0;
  const singleSelectedFolder = selectedFolders.length === 1 ? selectedFolders[0]! : null;
  const foldersChipLabel = foldersSelected
    ? selectedFolders.length === 1
      ? singleSelectedFolder!.name
      : t('notesGraph.filters.foldersCount', { count: selectedFolders.length })
    : t('notesGraph.filters.allFolders');

  const folderChipColor = singleSelectedFolder
    ? resolveDisplayFolderColor(singleSelectedFolder.color, isProActive)
    : undefined;
  const activeFolderForeground = folderChipColor
    ? folderChipActiveForeground(color, folderChipColor)
    : color.text.primary;

  const tagsSelected = filters.tags.length > 0;
  const tagsChipLabel = tagsSelected
    ? t('notesGraph.filters.tagsCount', { count: filters.tags.length })
    : t('notesGraph.filters.pickTags');

  const activeConnectionCount = countActiveConnectionFilters(filters);
  const connectionsCustomized = activeConnectionCount < CONNECTION_FILTER_COUNT;
  const connectionsChipLabel = connectionsCustomized
    ? t('notesGraph.filters.connectionsCount', { count: activeConnectionCount })
    : t('notesGraph.filters.pickConnections');

  const layoutChipTone = pickerChipTone(
    color,
    true,
    isDark,
    getLayoutModeIconAccent(filters.layoutMode, color),
  );
  const tagsChipTone = pickerChipTone(color, tagsSelected, isDark);
  const connectionsChipTone = pickerChipTone(color, connectionsCustomized, isDark);

  const folderChipTone: ChipTone = singleSelectedFolder
    ? {
        backgroundColor: folderChipColor!,
        borderColor: folderChipColor!,
        foregroundColor: activeFolderForeground,
      }
    : pickerChipTone(color, foldersSelected, isDark);

  const pickerIconColor = (tone: ChipTone) =>
    tone.foregroundColor === color.text.primary ? color.text.secondary : tone.foregroundColor;

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={{
        backgroundColor: color.background.primary,
        borderBottomWidth: 1.5,
        borderBottomColor: color.border.default,
        opacity: disabled ? 0.55 : 1,
        shadowColor: color.shadow.color,
        shadowOpacity: color.shadow.opacity * 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
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
            <GraphLayoutModeIcon
              mode={filters.layoutMode}
              accentHex={layoutChipTone.foregroundColor}
              size={FILTER_CHIP_ICON_SIZE}
            />
          }
        />

        <SelectorChip
          label={connectionsChipLabel}
          tone={connectionsChipTone}
          disabled={disabled}
          selected={connectionsCustomized}
          onPress={() => setConnectionsPickerVisible(true)}
          icon={
            <Waypoints
              size={FILTER_CHIP_ICON_SIZE}
              color={pickerIconColor(connectionsChipTone)}
              strokeWidth={2}
            />
          }
        />

        {foldersEnabled && !isLocalGraphMode && folders.length > 0 ? (
          <SelectorChip
            label={foldersChipLabel}
            tone={folderChipTone}
            disabled={disabled}
            selected={foldersSelected}
            onPress={() => setFolderPickerVisible(true)}
            icon={
              singleSelectedFolder ? (
                <FolderLucideIcon
                  iconId={singleSelectedFolder.icon}
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

        {!isLocalGraphMode && availableTags.length > 0 ? (
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

      {!isLocalGraphMode ? (
        <TagPickerSheet
          visible={tagPickerVisible}
          title={t('notesGraph.filters.tagPickerTitle')}
          tags={availableTags}
          selectedTags={filters.tags}
          onClose={() => setTagPickerVisible(false)}
          onApply={(tags) => onFiltersChange({ tags })}
        />
      ) : null}

      <GraphConnectionsFilterSheet
        visible={connectionsPickerVisible}
        showTasks={filters.showTasks}
        showCompletedTasks={filters.showCompletedTasks}
        edgeVisibility={filters.edgeVisibility}
        onClose={() => setConnectionsPickerVisible(false)}
        onApply={({ showTasks, showCompletedTasks, edgeVisibility }) =>
          onFiltersChange({
            showTasks,
            showCompletedTasks,
            edgeVisibility: {
              ...filters.edgeVisibility,
              ...edgeVisibility,
              contains: showTasks,
            },
          })
        }
      />

      {foldersEnabled && !isLocalGraphMode && folders.length > 0 ? (
        <GraphFolderPickerSheet
          visible={folderPickerVisible}
          title={t('notesGraph.filters.folderPickerTitle')}
          folders={folders}
          selectedFolderIds={filters.folderIds}
          onClose={() => setFolderPickerVisible(false)}
          onApply={(folderIds) => onFiltersChange({ folderIds })}
        />
      ) : null}
    </View>
  );
}
