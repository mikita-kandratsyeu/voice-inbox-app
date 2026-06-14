import { Check, Folder, Link2, ListChecks, Tag, Waypoints } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
  SheetRowIconLeading,
} from '@/shared/ui';

import type { GraphEdgeVisibility } from '../lib/graphTypes';

const CONNECTION_FILTER_ROW_HEIGHT = 52;

type ConnectionFilterKey = 'showTasks' | 'similar' | 'sharedTag' | 'sameFolder' | 'linked';

type ConnectionFilterDraft = {
  showTasks: boolean;
  similar: boolean;
  sharedTag: boolean;
  sameFolder: boolean;
  linked: boolean;
};

type GraphConnectionsFilterSheetProps = {
  visible: boolean;
  showTasks: boolean;
  edgeVisibility: GraphEdgeVisibility;
  onClose: () => void;
  onApply: (value: {
    showTasks: boolean;
    edgeVisibility: Pick<
      GraphEdgeVisibility,
      'similar' | 'sharedTag' | 'sameFolder' | 'linked'
    >;
  }) => void;
};

function getConnectionFilterAccent(key: ConnectionFilterKey, color: Colors): string {
  switch (key) {
    case 'showTasks':
      return color.accent.success;
    case 'similar':
      return color.accent.primary;
    case 'sharedTag':
      return color.accent.unpin;
    case 'sameFolder':
      return color.accent.models;
    case 'linked':
      return color.accent.success;
  }
}

function ConnectionFilterIcon({
  filterKey,
  accentHex,
}: {
  filterKey: ConnectionFilterKey;
  accentHex: string;
}) {
  const iconProps = {
    size: 18,
    color: accentHex,
    strokeWidth: 2,
  } as const;

  switch (filterKey) {
    case 'showTasks':
      return <ListChecks {...iconProps} />;
    case 'similar':
      return <Waypoints {...iconProps} />;
    case 'sharedTag':
      return <Tag {...iconProps} />;
    case 'sameFolder':
      return <Folder {...iconProps} />;
    case 'linked':
      return <Link2 {...iconProps} />;
  }
}

type ConnectionFilterRowProps = {
  label: string;
  filterKey: ConnectionFilterKey;
  selected: boolean;
  color: Colors;
  isLast: boolean;
  onPress: () => void;
};

function ConnectionFilterRow({
  label,
  filterKey,
  selected,
  color,
  isLast,
  onPress,
}: ConnectionFilterRowProps) {
  const accentHex = getConnectionFilterAccent(filterKey, color);
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        backgroundColor: pressed ? color.background.tertiary : 'transparent',
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      })}
    >
      <View
        style={{
          alignItems: 'stretch',
          flexDirection: 'row',
          gap: 12,
          minHeight: CONNECTION_FILTER_ROW_HEIGHT,
          paddingHorizontal: 14,
          paddingVertical: 10,
          width: '100%',
        }}
      >
        <SheetRowIconLeading
          color={color}
          accentHex={accentHex}
          icon={<ConnectionFilterIcon filterKey={filterKey} accentHex={accentHex} />}
        />
        <Text
          style={{
            color: color.text.primary,
            alignSelf: 'center',
            flex: 1,
            fontSize: 16,
            fontWeight: '600',
            lineHeight: 21,
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
        {selected ? (
          <View style={{ alignSelf: 'center' }}>
            <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={{ alignSelf: 'center', width: 20 }} />
        )}
      </View>
    </Pressable>
  );
}

function toDraft(showTasks: boolean, edgeVisibility: GraphEdgeVisibility): ConnectionFilterDraft {
  return {
    showTasks,
    similar: edgeVisibility.similar,
    sharedTag: edgeVisibility.sharedTag,
    sameFolder: edgeVisibility.sameFolder,
    linked: edgeVisibility.linked,
  };
}

export function GraphConnectionsFilterSheet({
  visible,
  showTasks,
  edgeVisibility,
  onClose,
  onApply,
}: GraphConnectionsFilterSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const [draft, setDraft] = useState<ConnectionFilterDraft>(() =>
    toDraft(showTasks, edgeVisibility),
  );

  useEffect(() => {
    if (!visible) return;
    setDraft(toDraft(showTasks, edgeVisibility));
  }, [edgeVisibility, showTasks, visible]);

  const options = useMemo(
    () =>
      [
        { key: 'showTasks' as const, label: t('notesGraph.filters.showTasks') },
        { key: 'similar' as const, label: t('notesGraph.filters.similar') },
        { key: 'sharedTag' as const, label: t('notesGraph.filters.tags') },
        { key: 'sameFolder' as const, label: t('notesGraph.filters.folders') },
        { key: 'linked' as const, label: t('notesGraph.filters.linked') },
      ] satisfies Array<{ key: ConnectionFilterKey; label: string }>,
    [t],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const toggleKey = useCallback((key: ConnectionFilterKey) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleApply = useCallback(() => {
    onApply({
      showTasks: draft.showTasks,
      edgeVisibility: {
        similar: draft.similar,
        sharedTag: draft.sharedTag,
        sameFolder: draft.sameFolder,
        linked: draft.linked,
      },
    });
    handleClose();
  }, [draft, handleClose, onApply]);

  const handleClear = useCallback(() => {
    setDraft({
      showTasks: false,
      similar: false,
      sharedTag: false,
      sameFolder: false,
      linked: false,
    });
  }, []);

  const draftActiveCount = useMemo(
    () =>
      Number(draft.showTasks) +
      Number(draft.similar) +
      Number(draft.sharedTag) +
      Number(draft.sameFolder) +
      Number(draft.linked),
    [draft],
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      <AppBottomSheetContent bottomPadding={12}>
        <SheetHeader
          title={t('notesGraph.filters.connectionsPickerTitle')}
          subtitle={t('notesGraph.filters.connectionsPickerSubtitle')}
          color={color}
          marginBottom={10}
        />

        <View
          style={{
            backgroundColor: color.background.card,
            borderColor: color.border.default,
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
          }}
        >
          {options.map((option, index) => (
            <ConnectionFilterRow
              key={option.key}
              label={option.label}
              filterKey={option.key}
              selected={draft[option.key]}
              color={color}
              isLast={index === options.length - 1}
              onPress={() => toggleKey(option.key)}
            />
          ))}
        </View>

        <SheetFooterButtons
          color={color}
          primaryLabel={t('common.done')}
          onPrimaryPress={handleApply}
          secondaryLabel={t('common.clear')}
          onSecondaryPress={handleClear}
          secondaryDisabled={draftActiveCount === 0}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
