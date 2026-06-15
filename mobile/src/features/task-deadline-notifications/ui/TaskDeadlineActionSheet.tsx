import dayjs from 'dayjs';
import { CheckCircle2, Clock3, FileText } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useColors } from '@/shared/config';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { hapticSelection, hapticSuccess } from '@/shared/lib/haptics';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib/taskDeadlineTimeDisplay';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetActionOptionRow,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import {
  markTaskDeadlineNotificationDone,
  snoozeTaskDeadlineNotification,
  type TaskDeadlineSnoozePreset,
} from '../lib/executeTaskDeadlineNotificationAction';
import { useTaskDeadlineActionSheet } from '../model/useTaskDeadlineActionSheet';

type SheetMode = 'actions' | 'snooze';

const SNOOZE_PRESETS: TaskDeadlineSnoozePreset[] = ['15m', '1h', 'tomorrow'];

export function TaskDeadlineActionSheet({
  onOpenNote,
}: {
  onOpenNote: (recordId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const color = useColors();
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

    const dateLabel = dayjs(parsed).locale(resolveDayjsLocale(i18n.language)).format('D MMM');
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

  const iconSize = 18;

  const actionRows =
    mode === 'snooze'
      ? SNOOZE_PRESETS.map((preset) => ({
          key: preset,
          label: snoozeLabel(preset),
          icon: null,
          onPress: () => handleSnooze(preset),
        }))
      : [
          ...(!payload?.isDone
            ? [
                {
                  key: 'mark-done',
                  label: t('taskDeadlineNotifications.sheet.markDone'),
                  icon: (
                    <CheckCircle2 size={iconSize} color={color.accent.success} strokeWidth={2} />
                  ),
                  onPress: () => {
                    void handleMarkDone();
                  },
                },
              ]
            : []),
          {
            key: 'snooze',
            label: t('taskDeadlineNotifications.sheet.snooze'),
            icon: <Clock3 size={iconSize} color={color.accent.cache} strokeWidth={2} />,
            onPress: () => {
              hapticSelection();
              setMode('snooze');
            },
          },
          {
            key: 'open-note',
            label: t('taskDeadlineNotifications.sheet.openNote'),
            icon: <FileText size={iconSize} color={color.text.secondary} strokeWidth={2} />,
            onPress: handleOpenNote,
          },
        ];

  return (
    <AppBottomSheetModal visible={visible} onClose={closeSheet}>
      <AppBottomSheetContent bottomPadding={12}>
        <SheetHeader
          title={title}
          subtitle={subtitle ?? undefined}
          color={color}
          marginBottom={10}
        />

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
            <SheetActionOptionRow
              key={row.key}
              label={row.label}
              icon={row.icon}
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
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
