import { BottomSheetView } from '@gorhom/bottom-sheet';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { hapticSelection, hapticSuccess } from '@/shared/lib/haptics';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib/taskDeadlineTimeDisplay';
import {
  AppBottomSheetModal,
  SheetFooterButtons,
  useBottomSheetContentPadding,
} from '@/shared/ui';

import {
  markTaskDeadlineNotificationDone,
  snoozeTaskDeadlineNotification,
  type TaskDeadlineSnoozePreset,
} from '../lib/executeTaskDeadlineNotificationAction';
import { useTaskDeadlineActionSheet } from '../model/useTaskDeadlineActionSheet';

type SheetMode = 'actions' | 'snooze';

const SNOOZE_PRESETS: TaskDeadlineSnoozePreset[] = ['15m', '1h', 'tomorrow'];

type SheetOptionRowProps = {
  label: string;
  onPress: () => void;
  isLast?: boolean;
};

function SheetOptionRow({ label, onPress, isLast = false }: SheetOptionRowProps) {
  const color = useColors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: color.border.default,
      }}
    >
      <Text style={{ fontSize: 16, color: color.text.primary }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function TaskDeadlineActionSheet({
  onOpenNote,
}: {
  onOpenNote: (recordId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(12);
  const { visible, payload, hide } = useTaskDeadlineActionSheet();
  const [mode, setMode] = useState<SheetMode>('actions');

  useEffect(() => {
    if (!visible) {
      setMode('actions');
    }
  }, [visible]);

  const subtitle = useMemo(() => {
    if (!payload || mode === 'snooze') return null;

    const parsed = parseTaskDeadline(payload.deadline);
    if (!parsed) return payload.recordTitle;

    const dateLabel = dayjs(parsed)
      .locale(resolveDayjsLocale(i18n.language))
      .format('D MMM');
    const timeLabel = payload.deadlineTime
      ? formatTaskDeadlineTimeForDisplay(payload.deadlineTime)
      : null;

    if (timeLabel) {
      return t('taskDeadlineNotifications.sheet.subtitleWithTime', {
        recordTitle: payload.recordTitle,
        date: dateLabel,
        time: timeLabel,
      });
    }

    return t('taskDeadlineNotifications.sheet.subtitle', {
      recordTitle: payload.recordTitle,
      date: dateLabel,
    });
  }, [i18n.language, mode, payload, t]);

  const title =
    mode === 'snooze'
      ? t('taskDeadlineNotifications.sheet.snoozeTitle')
      : payload?.taskText.trim() || t('taskDeadlineNotifications.fallbackTitle');

  const closeSheet = useCallback(() => {
    hide();
  }, [hide]);

  const handleFooterPress = useCallback(() => {
    if (mode === 'snooze') {
      setMode('actions');
      return;
    }
    closeSheet();
  }, [closeSheet, mode]);

  const handleMarkDone = useCallback(async () => {
    if (!payload || payload.isDone) {
      closeSheet();
      return;
    }

    hapticSuccess();
    await markTaskDeadlineNotificationDone(payload.recordId, payload.taskId);
    closeSheet();
  }, [closeSheet, payload]);

  const handleSnooze = useCallback(
    (preset: TaskDeadlineSnoozePreset) => {
      if (!payload) return;
      hapticSelection();
      snoozeTaskDeadlineNotification(payload.taskId, preset);
      closeSheet();
    },
    [closeSheet, payload],
  );

  const handleOpenNote = useCallback(() => {
    if (!payload) return;
    hapticSelection();
    onOpenNote(payload.recordId);
    closeSheet();
  }, [closeSheet, onOpenNote, payload]);

  const snoozeLabel = (preset: TaskDeadlineSnoozePreset) => {
    switch (preset) {
      case '15m':
        return t('taskDeadlineNotifications.sheet.snooze15m');
      case '1h':
        return t('taskDeadlineNotifications.sheet.snooze1h');
      case 'tomorrow':
        return t('taskDeadlineNotifications.sheet.snoozeTomorrow');
    }
  };

  const actionRows =
    mode === 'snooze'
      ? SNOOZE_PRESETS.map((preset) => ({
          key: preset,
          label: snoozeLabel(preset),
          onPress: () => handleSnooze(preset),
        }))
      : [
          ...(!payload?.isDone
            ? [
                {
                  key: 'mark-done',
                  label: t('taskDeadlineNotifications.sheet.markDone'),
                  onPress: () => {
                    void handleMarkDone();
                  },
                },
              ]
            : []),
          {
            key: 'snooze',
            label: t('taskDeadlineNotifications.sheet.snooze'),
            onPress: () => {
              hapticSelection();
              setMode('snooze');
            },
          },
          {
            key: 'open-note',
            label: t('taskDeadlineNotifications.sheet.openNote'),
            onPress: handleOpenNote,
          },
        ];

  return (
    <AppBottomSheetModal visible={visible} onClose={closeSheet}>
      <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 8, ...contentPadding }}>
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
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 10,
              textAlign: 'center',
              paddingHorizontal: 4,
            }}
          >
            {subtitle}
          </Text>
        ) : null}

        <View
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.card,
          }}
        >
          {actionRows.map((row, index) => (
            <SheetOptionRow
              key={row.key}
              label={row.label}
              onPress={row.onPress}
              isLast={index === actionRows.length - 1}
            />
          ))}
        </View>

        <SheetFooterButtons
          className="mt-3 w-full"
          color={color}
          primaryLabel={mode === 'snooze' ? t('common.goBack') : t('common.cancel')}
          onPrimaryPress={handleFooterPress}
          singleVariant="secondary"
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
