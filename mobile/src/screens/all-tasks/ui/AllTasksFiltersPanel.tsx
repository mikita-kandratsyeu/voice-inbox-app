import { Folder as FolderIcon, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView as HorizontalScroll, Text, TouchableOpacity, View } from 'react-native';

import { type Folder as FolderModel, FolderPickerSheet } from '@/entities/folder';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import {
  folderChipActiveForeground,
  hapticSelection,
  resolveDisplayFolderColor,
} from '@/shared/lib';

import type { AllTasksQuickFilter } from '../types';
import { AllTasksMoreFiltersSheet } from './AllTasksMoreFiltersSheet';

const PRIMARY_FILTERS: AllTasksQuickFilter[] = ['all', 'overdue', 'today'];
const SECONDARY_FILTERS: AllTasksQuickFilter[] = ['highPriority', 'noDate', 'done'];

type AllTasksFiltersPanelProps = {
  color: Colors;
  activeFilter: AllTasksQuickFilter;
  foldersEnabled: boolean;
  folders: FolderModel[];
  activeFolderId: string | null;
  onFilterSelect: (filter: AllTasksQuickFilter) => void;
  onFolderSelect: (id: string | null) => void;
};

type FilterChipProps = {
  label: string;
  isActive: boolean;
  color: Colors;
  onPress: () => void;
  icon?: React.ReactNode;
  activeBackgroundColor?: string;
  activeForegroundColor?: string;
  inactiveBackgroundColor?: string;
  inactiveForegroundColor?: string;
};

function FilterChip({
  label,
  isActive,
  color,
  onPress,
  icon,
  activeBackgroundColor,
  activeForegroundColor,
  inactiveBackgroundColor,
  inactiveForegroundColor,
}: FilterChipProps) {
  const foregroundColor = isActive
    ? (activeForegroundColor ?? color.icon.onAccent)
    : (inactiveForegroundColor ?? color.text.primary);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: isActive
          ? (activeBackgroundColor ?? color.accent.primary)
          : (inactiveBackgroundColor ?? color.background.tertiary),
        marginRight: 8,
        gap: 4,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: foregroundColor,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function AllTasksFiltersPanel({
  color,
  activeFilter,
  foldersEnabled,
  folders,
  activeFolderId,
  onFilterSelect,
  onFolderSelect,
}: AllTasksFiltersPanelProps) {
  const { t } = useTranslation();
  const { isProActive } = useProEntitlement();
  const [moreFiltersVisible, setMoreFiltersVisible] = useState(false);
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);

  const isSecondaryFilterActive = useMemo(
    () => SECONDARY_FILTERS.includes(activeFilter),
    [activeFilter],
  );

  const moreChipLabel = isSecondaryFilterActive
    ? t(`allTasks.quickFilters.${activeFilter}`)
    : t('allTasks.moreFilters');
  const activeFolder = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId),
    [activeFolderId, folders],
  );
  const activeFolderColor = activeFolder
    ? resolveDisplayFolderColor(activeFolder.color, isProActive)
    : undefined;
  const activeFolderForeground = activeFolderColor
    ? folderChipActiveForeground(color, activeFolderColor)
    : color.icon.onAccent;
  const hasActiveFilters = activeFilter !== 'all' || activeFolderId !== null;

  return (
    <>
      <View
        style={{
          backgroundColor: color.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
        }}
      >
        <HorizontalScroll
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          {foldersEnabled ? (
            <FilterChip
              label={activeFolder?.name ?? t('allTasks.allFolders')}
              isActive={activeFolderId !== null}
              color={color}
              activeBackgroundColor={activeFolderColor}
              activeForegroundColor={activeFolderForeground}
              icon={
                activeFolder ? (
                  <FolderLucideIcon
                    iconId={activeFolder.icon}
                    size={14}
                    color={activeFolderForeground}
                    strokeWidth={2.2}
                  />
                ) : (
                  <FolderIcon size={14} color={color.text.primary} strokeWidth={2.2} />
                )
              }
              onPress={() => {
                hapticSelection();
                setFolderPickerVisible(true);
              }}
            />
          ) : null}
          {PRIMARY_FILTERS.map((filter) => (
            <FilterChip
              key={filter}
              label={t(`allTasks.quickFilters.${filter}`)}
              isActive={activeFilter === filter}
              color={color}
              onPress={() => {
                hapticSelection();
                onFilterSelect(filter);
              }}
            />
          ))}
          <FilterChip
            label={moreChipLabel}
            isActive={isSecondaryFilterActive}
            color={color}
            icon={
              !isSecondaryFilterActive ? (
                <SlidersHorizontal
                  size={14}
                  color={isSecondaryFilterActive ? color.icon.onAccent : color.text.primary}
                  strokeWidth={2.2}
                />
              ) : undefined
            }
            onPress={() => {
              hapticSelection();
              setMoreFiltersVisible(true);
            }}
          />
          {hasActiveFilters ? (
            <FilterChip
              label={t('allTasks.resetFilters')}
              isActive={false}
              color={color}
              icon={<X size={14} color={color.text.secondary} strokeWidth={2.4} />}
              inactiveForegroundColor={color.text.secondary}
              onPress={() => {
                hapticSelection();
                onFilterSelect('all');
                onFolderSelect(null);
              }}
            />
          ) : null}
        </HorizontalScroll>
      </View>

      <AllTasksMoreFiltersSheet
        visible={moreFiltersVisible}
        activeFilter={activeFilter}
        onClose={() => setMoreFiltersVisible(false)}
        onSelect={onFilterSelect}
      />
      {foldersEnabled ? (
        <FolderPickerSheet
          visible={folderPickerVisible}
          title={t('allTasks.folderFilterTitle')}
          subtitle={t('allTasks.folderFilterSubtitle')}
          folders={folders}
          currentFolderId={activeFolderId}
          inboxLabel={t('allTasks.allFolders')}
          inboxSubtitle={t('allTasks.allFoldersSubtitle')}
          onClose={() => setFolderPickerVisible(false)}
          onSelect={onFolderSelect}
        />
      ) : null}
    </>
  );
}
