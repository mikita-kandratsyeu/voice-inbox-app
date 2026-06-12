import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

import type { TaskItem, VoiceRecord } from '@/entities/record';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';
import {
  formatLocalTimeOfDay,
  formatTaskDeadlineTimeForDisplay,
} from '@/shared/lib/taskDeadlineTimeDisplay';

export type RecordCardNoteKind = 'voice' | 'text' | 'meeting';

const OPEN_TASK_PREVIEW_LIMIT = 2;

export function resolveRecordCardNoteKind(
  record: Pick<
    VoiceRecord,
    | 'audioPath'
    | 'meetingSummaryTemplate'
    | 'classification'
    | 'meetingDialogue'
    | 'meetingDialogueStatus'
  >,
): RecordCardNoteKind {
  const isMeeting =
    Boolean(record.meetingSummaryTemplate) ||
    record.classification === 'meeting' ||
    Boolean(record.meetingDialogue?.trim()) ||
    record.meetingDialogueStatus === 'processing' ||
    record.meetingDialogueStatus === 'done' ||
    record.meetingDialogueStatus === 'failed';

  if (isMeeting) return 'meeting';
  if (!record.audioPath?.trim()) return 'text';
  return 'voice';
}

function compareOpenTasksForPreview(a: TaskItem, b: TaskItem): number {
  const deadlineA = parseTaskDeadline(a.deadline);
  const deadlineB = parseTaskDeadline(b.deadline);

  if (deadlineA && deadlineB) return deadlineA.getTime() - deadlineB.getTime();
  if (deadlineA) return -1;
  if (deadlineB) return 1;
  return 0;
}

export function pickOpenTasksForCardPreview(tasks: TaskItem[]): TaskItem[] {
  return tasks
    .filter((task) => !task.isDone)
    .sort(compareOpenTasksForPreview)
    .slice(0, OPEN_TASK_PREVIEW_LIMIT);
}

export function formatExpandedCardDate(isoDate: string, language: string, t: TFunction): string {
  const dayjsLocale = resolveDayjsLocale(language);
  const date = dayjs(isoDate).locale(dayjsLocale);

  if (!date.isValid()) {
    return '';
  }

  const now = dayjs();
  const time = formatLocalTimeOfDay(date.toDate());
  const diffMinutes = now.diff(date, 'minute');
  const dayDiff = now.startOf('day').diff(date.startOf('day'), 'day');

  if (diffMinutes < 60) {
    return date.fromNow();
  }

  if (dayDiff === 0) {
    return `${t('allTasks.today')}, ${time}`;
  }

  if (dayDiff === 1) {
    return `${t('allTasks.yesterday')}, ${time}`;
  }

  if (dayDiff < 7) {
    return `${date.format('dddd, D MMMM')}, ${time}`;
  }

  const isCurrentYear = date.year() === now.year();
  const datePart = isCurrentYear ? date.format('dddd, D MMMM') : date.format('dddd, D MMMM YYYY');

  return `${datePart}, ${time}`;
}

export { countRecordCardTextFragments } from './textNoteFragments';

export function formatRecordCardTaskDeadline(
  task: TaskItem,
  language: string,
  t: TFunction,
): { label: string; isOverdue: boolean } | null {
  const parsed = parseTaskDeadline(task.deadline);
  if (!parsed) return null;

  const today = dayjs().startOf('day');
  const taskDay = dayjs(parsed).startOf('day');
  let label: string;

  if (taskDay.isSame(today, 'day')) {
    label = t('allTasks.scheduleToday');
  } else if (taskDay.isSame(today.add(1, 'day'), 'day')) {
    label = t('allTasks.scheduleTomorrow');
  } else {
    label = taskDay.locale(resolveDayjsLocale(language)).format('D MMM');
  }

  if (task.deadlineTime) {
    label += `, ${formatTaskDeadlineTimeForDisplay(task.deadlineTime)}`;
  }

  return {
    label,
    isOverdue: !task.isDone && taskDay.isBefore(today, 'day'),
  };
}
