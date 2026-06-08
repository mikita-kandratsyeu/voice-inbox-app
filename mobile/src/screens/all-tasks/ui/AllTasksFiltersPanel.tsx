import { Folder, SlidersHorizontal } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView as HorizontalScroll, Text, TouchableOpacity, View } from 'react-native';

import { FolderPickerSheet, type Folder as FolderModel } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

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
};

function FilterChip({ label, isActive, color, onPress, icon }: FilterChipProps) {
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
        backgroundColor: isActive ? color.accent.primary : color.background.tertiary,
        marginRight: 8,
        gap: 4,
      }}
    >
      {icon}
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
  const [moreFiltersVisible, setMoreFiltersVisible] = useState(false);
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);

  const isSecondaryFilterActive = useMemo(
    () => SECONDARY_FILTERS.includes(activeFilter),
    [activeFilter],
  );

  const moreChipLabel = isSecondaryFilterActive
    ? t(`allTasks.quickFilters.${activeFilter}`)
    : t('allTasks.moreFilters');
  const activeFolderName = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId)?.name,
    [activeFolderId, folders],
  );

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
              label={activeFolderName ?? t('allTasks.allFolders')}
              isActive={activeFolderId !== null}
              color={color}
              icon={
                <Folder
                  size={14}
                  color={activeFolderId !== null ? color.icon.onAccent : color.text.primary}
                  strokeWidth={2.2}
                />
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
