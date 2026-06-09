import { BottomSheetView } from '@gorhom/bottom-sheet';
import dayjs from 'dayjs';
import { Check, History, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import { buildNotesGraphLayoutFilterSummaryFromParsed } from '../lib/buildNotesGraphLayoutFilterSummary';
import type { NotesGraphLayoutVersionEntry } from '../lib/notesGraphLayoutDb';
import { listAllNotesGraphLayoutHistory } from '../lib/notesGraphLayoutDb';
import { parseNotesGraphPersistKey } from '../lib/parseNotesGraphPersistKey';

const HISTORY_LIST_MAX_HEIGHT = 320;
const HISTORY_ROW_HEIGHT = 68;

type GraphLayoutHistorySheetProps = {
  visible: boolean;
  folders: Folder[];
  foldersEnabled: boolean;
  activeVersionId: string | null;
  refreshToken: number;
  onClose: () => void;
  onApply: (entry: NotesGraphLayoutVersionEntry) => void | Promise<void>;
  onDelete: (versionId: string) => void | Promise<void>;
};

type AppliedFiltersCardProps = {
  color: Colors;
  rows: { id: string; label: string; value: string }[];
  title: string;
  emptyMessage: string;
};

function AppliedFiltersCard({ color, rows, title, emptyMessage }: AppliedFiltersCardProps) {
  return (
    <View
      style={{
        alignSelf: 'stretch',
        backgroundColor: color.background.card,
        borderColor: color.border.default,
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
        marginBottom: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          color: color.text.secondary,
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 16,
          marginBottom: 2,
        }}
      >
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text style={{ color: color.text.secondary, fontSize: 12, lineHeight: 16 }}>
          {emptyMessage}
        </Text>
      ) : (
        rows.map((row) => (
          <View
            key={row.id}
            style={{
              alignItems: 'flex-start',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <Text
              style={{
                color: color.text.secondary,
                flexShrink: 0,
                fontSize: 12,
                lineHeight: 16,
                width: 88,
              }}
            >
              {row.label}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: color.text.primary,
                flex: 1,
                fontSize: 12,
                lineHeight: 16,
                minWidth: 0,
              }}
            >
              {row.value}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function formatVersionTimestamp(iso: string, language: string): string {
  const loc = resolveDayjsLocale(language);
  return `${dayjs(iso).locale(loc).format('D MMM YYYY')} · ${dayjs(iso).locale(loc).format('HH:mm')}`;
}

type HistoryRowProps = {
  isSelected: boolean;
  isLast: boolean;
  isDeleting: boolean;
  color: Colors;
  rowLabel: string;
  versionLabel: string;
  metaLabel: string;
  deleteA11y: string;
  onSelect: () => void;
  onDelete: () => void;
};

function HistoryRow({
  isSelected,
  isLast,
  isDeleting,
  color,
  rowLabel,
  versionLabel,
  metaLabel,
  deleteA11y,
  onSelect,
  onDelete,
}: HistoryRowProps) {
  return (
    <View
      style={{
        alignSelf: 'stretch',
        backgroundColor: isSelected ? `${color.accent.primary}12` : 'transparent',
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        opacity: isDeleting ? 0.45 : 1,
        width: '100%',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: HISTORY_ROW_HEIGHT,
          paddingHorizontal: 14,
          paddingVertical: 10,
          width: '100%',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: color.background.tertiary,
            borderRadius: 10,
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          <History size={18} color={color.text.secondary} strokeWidth={2} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={rowLabel}
            disabled={isDeleting}
            onPress={() => {
              hapticSelection();
              onSelect();
            }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? color.background.tertiary : 'transparent',
              borderRadius: 10,
              justifyContent: 'center',
              paddingVertical: 2,
            })}
          >
            <Text
              style={{ color: color.text.primary, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
              numberOfLines={1}
            >
              {versionLabel}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: color.text.secondary,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 3,
              }}
            >
              {metaLabel}
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deleteA11y}
          disabled={isDeleting}
          onPress={() => {
            hapticSelection();
            onDelete();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: pressed ? color.background.tertiary : 'transparent',
            borderRadius: 8,
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          })}
        >
          <Trash2 size={18} color={color.status.error.text} strokeWidth={2.2} />
        </Pressable>

        {isSelected ? (
          <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>
    </View>
  );
}

export function GraphLayoutHistorySheet({
  visible,
  folders,
  foldersEnabled,
  activeVersionId,
  refreshToken,
  onClose,
  onApply,
  onDelete,
}: GraphLayoutHistorySheetProps) {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(12);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<NotesGraphLayoutVersionEntry[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAllNotesGraphLayoutHistory();
      setEntries(rows);
      setSelectedVersionId((current) => {
        if (current && rows.some((row) => row.id === current)) return current;
        if (activeVersionId && rows.some((row) => row.id === activeVersionId)) {
          return activeVersionId;
        }
        return rows[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [activeVersionId]);

  useEffect(() => {
    if (!visible) return;
    void loadHistory();
  }, [visible, loadHistory, refreshToken]);

  useEffect(() => {
    if (!visible) {
      setDeletingVersionId(null);
      setIsApplying(false);
    }
  }, [visible]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedVersionId) ?? null,
    [entries, selectedVersionId],
  );

  const selectedParsed = useMemo(
    () => (selectedEntry ? parseNotesGraphPersistKey(selectedEntry.layoutKey) : null),
    [selectedEntry],
  );

  const selectedFolderName = useMemo(() => {
    if (!selectedParsed?.folderId) return null;
    return folders.find((folder) => folder.id === selectedParsed.folderId)?.name ?? null;
  }, [folders, selectedParsed]);

  const filterRows = useMemo(() => {
    if (!selectedParsed) return [];
    return buildNotesGraphLayoutFilterSummaryFromParsed(
      selectedParsed,
      selectedFolderName,
      foldersEnabled,
      t,
    );
  }, [foldersEnabled, selectedFolderName, selectedParsed, t]);

  const confirmDelete = useCallback(
    (entry: NotesGraphLayoutVersionEntry) => {
      Alert.alert(
        t('notesGraph.history.deleteTitle'),
        t('notesGraph.history.deleteMessage', { version: entry.versionNumber }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setDeletingVersionId(entry.id);
                try {
                  await onDelete(entry.id);
                  setEntries((prev) => {
                    const next = prev.filter((row) => row.id !== entry.id);
                    setSelectedVersionId((current) => {
                      if (current !== entry.id) return current;
                      return next[0]?.id ?? null;
                    });
                    return next;
                  });
                } finally {
                  setDeletingVersionId(null);
                }
              })();
            },
          },
        ],
      );
    },
    [onDelete, t],
  );

  const listHeight = useMemo(
    () => Math.min(entries.length * HISTORY_ROW_HEIGHT, HISTORY_LIST_MAX_HEIGHT),
    [entries.length],
  );

  const subtitle = t('notesGraph.history.subtitle');

  let listBody: React.ReactNode;

  if (loading) {
    listBody = (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <ActivityIndicator size="small" color={color.accent.primary} />
      </View>
    );
  } else if (entries.length === 0) {
    listBody = (
      <Text
        style={{
          color: color.text.secondary,
          fontSize: 15,
          lineHeight: 22,
          marginBottom: 12,
          paddingVertical: 24,
          textAlign: 'center',
        }}
      >
        {t('notesGraph.history.empty')}
      </Text>
    );
  } else {
    listBody = (
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: color.background.card,
          borderColor: color.border.default,
          borderRadius: 12,
          borderWidth: 1,
          height: listHeight,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <ScrollView
          nestedScrollEnabled
          contentContainerStyle={{ width: '100%' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {entries.map((item, index) => {
            const isSelected = item.id === selectedVersionId;
            const rowLabel = `${formatVersionTimestamp(item.createdAt, i18n.language)} · ${t('notesGraph.history.nodeCount', { count: item.nodeCount })}`;

            return (
              <HistoryRow
                key={item.id}
                isSelected={isSelected}
                isLast={index === entries.length - 1}
                isDeleting={deletingVersionId === item.id}
                color={color}
                rowLabel={rowLabel}
                versionLabel={formatVersionTimestamp(item.createdAt, i18n.language)}
                metaLabel={t('notesGraph.history.listMeta', {
                  version: item.versionNumber,
                  count: item.nodeCount,
                })}
                deleteA11y={t('notesGraph.history.deleteA11y', { version: item.versionNumber })}
                onSelect={() => setSelectedVersionId(item.id)}
                onDelete={() => confirmDelete(item)}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const handleApply = useCallback(() => {
    if (!selectedEntry || isApplying) return;

    void (async () => {
      setIsApplying(true);
      try {
        await onApply(selectedEntry);
        onClose();
      } finally {
        setIsApplying(false);
      }
    })();
  }, [isApplying, onApply, onClose, selectedEntry]);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView style={{ paddingHorizontal: 20, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: subtitle ? 4 : 10,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('notesGraph.history.title')}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Text>
        ) : null}

        {listBody}

        <AppliedFiltersCard
          color={color}
          rows={filterRows}
          title={t('notesGraph.history.filtersTitle')}
          emptyMessage={t('notesGraph.history.filtersSelectHint')}
        />

        <SheetFooterButtons
          color={color}
          onPrimaryPress={handleApply}
          primaryLabel={t('notesGraph.history.apply')}
          primaryDisabled={!selectedEntry || isApplying}
          primaryLoading={isApplying}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
