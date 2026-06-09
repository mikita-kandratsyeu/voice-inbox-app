import { BottomSheetView } from '@gorhom/bottom-sheet';
import dayjs from 'dayjs';
import { Check, History, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import type { NotesGraphLayoutVersionEntry } from '../lib/notesGraphLayoutDb';
import { listNotesGraphLayoutHistory } from '../lib/notesGraphLayoutDb';

const HISTORY_LIST_MAX_HEIGHT = 420;
const HISTORY_ROW_HEIGHT = 68;

type GraphLayoutHistorySheetProps = {
  visible: boolean;
  layoutKey: string;
  activeVersionId: string | null;
  refreshToken: number;
  onClose: () => void;
  onRestore: (versionId: string) => void;
  onDelete: (versionId: string) => void | Promise<void>;
};

function formatVersionTimestamp(iso: string, language: string): string {
  const loc = resolveDayjsLocale(language);
  return `${dayjs(iso).locale(loc).format('D MMM YYYY')} · ${dayjs(iso).locale(loc).format('HH:mm')}`;
}

type HistoryRowProps = {
  isActive: boolean;
  isLast: boolean;
  isDeleting: boolean;
  color: Colors;
  rowLabel: string;
  versionLabel: string;
  metaLabel: string;
  deleteA11y: string;
  onRestore: () => void;
  onDelete: () => void;
};

function HistoryRow({
  isActive,
  isLast,
  isDeleting,
  color,
  rowLabel,
  versionLabel,
  metaLabel,
  deleteA11y,
  onRestore,
  onDelete,
}: HistoryRowProps) {
  return (
    <View
      style={{
        alignSelf: 'stretch',
        backgroundColor: isActive ? `${color.accent.primary}12` : 'transparent',
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
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={rowLabel}
            disabled={isDeleting}
            onPress={() => {
              hapticSelection();
              onRestore();
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
              numberOfLines={1}
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

        {isActive ? (
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
  layoutKey,
  activeVersionId,
  refreshToken,
  onClose,
  onRestore,
  onDelete,
}: GraphLayoutHistorySheetProps) {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(12);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<NotesGraphLayoutVersionEntry[]>([]);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listNotesGraphLayoutHistory(layoutKey);
      setEntries(rows);
    } finally {
      setLoading(false);
    }
  }, [layoutKey]);

  useEffect(() => {
    if (!visible) return;
    void loadHistory();
  }, [visible, loadHistory, refreshToken]);

  useEffect(() => {
    if (!visible) setDeletingVersionId(null);
  }, [visible]);

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
                  setEntries((prev) => prev.filter((row) => row.id !== entry.id));
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
            const isActive = item.id === activeVersionId;
            const rowLabel = `${t('notesGraph.history.versionLabel', { version: item.versionNumber })} · ${formatVersionTimestamp(item.createdAt, i18n.language)}`;

            return (
              <HistoryRow
                key={item.id}
                isActive={isActive}
                isLast={index === entries.length - 1}
                isDeleting={deletingVersionId === item.id}
                color={color}
                rowLabel={rowLabel}
                versionLabel={t('notesGraph.history.versionLabel', { version: item.versionNumber })}
                metaLabel={`${formatVersionTimestamp(item.createdAt, i18n.language)} · ${t('notesGraph.history.nodeCount', { count: item.nodeCount })}`}
                deleteA11y={t('notesGraph.history.deleteA11y', { version: item.versionNumber })}
                onRestore={() => {
                  onRestore(item.id);
                  onClose();
                }}
                onDelete={() => confirmDelete(item)}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  }

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

        <SheetFooterButtons
          color={color}
          onPrimaryPress={onClose}
          primaryLabel={t('common.close')}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
