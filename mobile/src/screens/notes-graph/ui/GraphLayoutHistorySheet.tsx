import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import dayjs from 'dayjs';
import { Check, History } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import type { NotesGraphLayoutVersionEntry } from '../lib/notesGraphLayoutDb';
import { listNotesGraphLayoutHistory } from '../lib/notesGraphLayoutDb';

type GraphLayoutHistorySheetProps = {
  visible: boolean;
  layoutKey: string;
  activeVersionId: string | null;
  refreshToken: number;
  onClose: () => void;
  onRestore: (versionId: string) => void;
};

function formatVersionTimestamp(iso: string, language: string): string {
  const loc = resolveDayjsLocale(language);
  return `${dayjs(iso).locale(loc).format('D MMM YYYY')} · ${dayjs(iso).locale(loc).format('HH:mm')}`;
}

export function GraphLayoutHistorySheet({
  visible,
  layoutKey,
  activeVersionId,
  refreshToken,
  onClose,
  onRestore,
}: GraphLayoutHistorySheetProps) {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(24);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<NotesGraphLayoutVersionEntry[]>([]);

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

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          ...contentPadding,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: color.text.primary,
            textAlign: 'center',
            paddingTop: 4,
            marginBottom: 8,
          }}
        >
          {t('notesGraph.history.title')}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: color.text.secondary,
            textAlign: 'center',
            marginBottom: 16,
            paddingHorizontal: 4,
          }}
        >
          {t('notesGraph.history.subtitle')}
        </Text>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="small" color={color.accent.primary} />
          </View>
        ) : entries.length === 0 ? (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
              paddingHorizontal: 16,
              paddingVertical: 28,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <History size={22} color={color.text.muted} strokeWidth={2.2} />
            <Text style={{ color: color.text.secondary, fontSize: 14, textAlign: 'center' }}>
              {t('notesGraph.history.empty')}
            </Text>
          </View>
        ) : (
          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
            }}
          >
            {entries.map((entry, index) => {
              const isActive = entry.id === activeVersionId;
              const rowLabel = `${t('notesGraph.history.versionLabel', { version: entry.versionNumber })} · ${formatVersionTimestamp(entry.createdAt, i18n.language)}`;
              return (
                <TouchableOpacity
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={rowLabel}
                  onPress={() => {
                    onRestore(entry.id);
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: color.border.default,
                    backgroundColor: isActive ? `${color.accent.primary}12` : color.background.card,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: color.text.primary, fontSize: 15, fontWeight: '600' }}>
                      {t('notesGraph.history.versionLabel', { version: entry.versionNumber })}
                    </Text>
                    <Text style={{ color: color.text.secondary, fontSize: 13, lineHeight: 18 }}>
                      {formatVersionTimestamp(entry.createdAt, i18n.language)}
                      {' · '}
                      {t('notesGraph.history.nodeCount', { count: entry.nodeCount })}
                    </Text>
                  </View>
                  {isActive ? <Check size={20} color={color.accent.primary} strokeWidth={2.4} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <SheetFooterButtons color={color} onPrimaryPress={onClose} primaryLabel={t('common.close')} />
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  );
}
