import { FlashList } from '@shopify/flash-list';
import { History, RotateCcw } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { formatRelativeTime, hapticSelection } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import type { IcloudSyncVersionSummary } from '../lib/fetchIcloudSyncHistory';

const HISTORY_ROW_PADDING_V = 12;
const HISTORY_ROW_ICON_SIZE = 36;
const HISTORY_ROW_TITLE_LINE = 21;
const HISTORY_ROW_META_GAP = 3;
const HISTORY_ROW_META_LINE = 18;
const HISTORY_ROW_HEIGHT =
  HISTORY_ROW_PADDING_V * 2 +
  Math.max(
    HISTORY_ROW_ICON_SIZE,
    HISTORY_ROW_TITLE_LINE + HISTORY_ROW_META_GAP + HISTORY_ROW_META_LINE,
  );
const HISTORY_LIST_MAX_HEIGHT = 420;
const HISTORY_ACTION_BUTTON_SIZE = 36;
const HISTORY_ACTION_ICON_SIZE = 18;

type Props = {
  visible: boolean;
  color: Colors;
  versions: IcloudSyncVersionSummary[];
  loading: boolean;
  restoringVersionId: string | null;
  onClose: () => void;
  onLoad: () => void | Promise<void>;
  onRestore: (version: IcloudSyncVersionSummary) => void;
};

type HistoryListRowProps = {
  color: Colors;
  version: IcloudSyncVersionSummary;
  isLast: boolean;
  metaLabel: string;
  title: string;
  restoring: boolean;
  onRestore: (version: IcloudSyncVersionSummary) => void;
};

function HistoryListRow({
  color,
  version,
  isLast,
  metaLabel,
  title,
  restoring,
  onRestore,
}: HistoryListRowProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: 52,
          paddingHorizontal: 14,
          paddingVertical: 12,
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
          <History size={18} color={color.accent.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'center', minWidth: 0 }}>
          <Text
            style={{ color: color.text.primary, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
            numberOfLines={2}
          >
            {title}
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
        </View>
        <Pressable
          onPress={() => {
            if (restoring) return;
            hapticSelection();
            onRestore(version);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('settings.icloudSync.restoreVersionA11y', { title })}
          accessibilityState={{ disabled: restoring, busy: restoring }}
          disabled={restoring}
          hitSlop={4}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: color.background.tertiary,
            borderRadius: 10,
            height: HISTORY_ACTION_BUTTON_SIZE,
            justifyContent: 'center',
            opacity: restoring ? 0.45 : pressed ? 0.6 : 1,
            width: HISTORY_ACTION_BUTTON_SIZE,
          })}
        >
          {restoring ? (
            <ActivityIndicator color={color.accent.primary} size="small" />
          ) : (
            <RotateCcw
              size={HISTORY_ACTION_ICON_SIZE}
              color={color.accent.success}
              strokeWidth={2}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function IcloudSyncHistorySheet({
  visible,
  color,
  versions,
  loading,
  restoringVersionId,
  onClose,
  onLoad,
  onRestore,
}: Props) {
  const { t, i18n } = useTranslation();
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      void onLoadRef.current();
    }
  }, [visible]);

  useEffect(() => {
    setContentHeight(null);
  }, [versions]);

  const estimatedListHeight = versions.length * HISTORY_ROW_HEIGHT;
  const naturalListHeight = contentHeight ?? estimatedListHeight;
  const listHeight = Math.min(naturalListHeight, HISTORY_LIST_MAX_HEIGHT);
  const listScrollEnabled = naturalListHeight > HISTORY_LIST_MAX_HEIGHT;

  const renderItem = useCallback(
    ({ item, index }: { item: IcloudSyncVersionSummary; index: number }) => (
      <HistoryListRow
        color={color}
        version={item}
        isLast={index === versions.length - 1}
        title={item.label || t('settings.icloudSync.untitledVersion')}
        metaLabel={`${formatRelativeTime(item.exportedAt, i18n.language)} · ${t('inbox.recordsCount', { count: item.recordCount })}`}
        restoring={restoringVersionId === item.versionId}
        onRestore={onRestore}
      />
    ),
    [color, i18n.language, onRestore, restoringVersionId, t, versions.length],
  );

  const keyExtractor = useCallback((item: IcloudSyncVersionSummary) => item.versionId, []);

  const listBody = loading ? (
    <View className="items-center py-10">
      <ActivityIndicator color={color.accent.primary} />
    </View>
  ) : versions.length === 0 ? (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 24,
        textAlign: 'center',
      }}
    >
      {t('settings.icloudSync.historyEmpty')}
    </Text>
  ) : (
    <View
      className="w-full"
      style={{
        backgroundColor: color.background.card,
        borderColor: color.border.default,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        height: listHeight,
        width: '100%',
      }}
    >
      <FlashList
        data={versions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        scrollEnabled={listScrollEnabled}
        onContentSizeChange={(_, height) => {
          if (height > 0) {
            setContentHeight(height);
          }
        }}
      />
    </View>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent bottomPadding={12} style={{ paddingTop: 4 }}>
        <SheetHeader
          title={t('settings.icloudSync.historyTitle')}
          subtitle={t('settings.icloudSync.historySubtitle')}
          color={color}
          marginBottom={10}
        />
        {listBody}
        <SheetFooterButtons
          color={color}
          className="mt-4 w-full"
          primaryLabel={t('common.close')}
          onPrimaryPress={onClose}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
