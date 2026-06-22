import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { CalendarDays, Plus, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { RootStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import { type TaskItem, useRecordStore } from '@/entities/record';
import { areFoldersEnabledInAiMode, useSettingsStore } from '@/entities/settings';
import { useAddToCalendar } from '@/features/add-to-calendar';
import { useAddToReminder } from '@/features/add-to-reminder';
import { useAdsAllowed } from '@/features/app-storefront';
import { DeferredInboxBannerAd, InboxBannerAd } from '@/features/inbox-banner';
import { useManageFolders } from '@/features/manage-folders';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import {
  normalizeOutcomeText,
  TaskOutcomeSheet,
  useTaskCompletionFlow,
} from '@/features/task-outcome';
import { TaskEditSheet } from '@/screens/recording-detail/ui/TaskEditSheet';
import { useColors } from '@/shared/config';
import {
  flashListJumpToTop,
  hapticSelection,
  useIsTablet,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import {
  taskDeadlineValidationErrorKey,
  validateTaskDeadlineFields,
} from '@/shared/lib/validateTaskDeadlineInput';
import {
  EmptyState,
  FrostedHeaderButtonGroup,
  HeaderIconButton,
  ScreenHeader,
  SectionHeader,
} from '@/shared/ui';

import { sortTaskRows } from '../lib/applyAllTasksQuickFilter';
import { buildAllTasksRows } from '../lib/buildAllTasksRows';
import {
  buildTaskCountsByDeadlineDay,
  filterTasksByCalendarDate,
} from '../lib/filterTasksByCalendarDate';
import {
  getAllTasksListBucket,
  TASK_DEADLINE_BUCKET_ORDER,
} from '../lib/groupTasksByDeadlineBucket';
import {
  type AllTasksFlattenedItem,
  type AllTasksListItem,
  injectAllTasksListBannerCard,
} from '../lib/injectAllTasksListBannerCard';
import type { AllTasksQuickFilter, TaskDeadlineBucket, TaskWithRecord } from '../types';
import { AllTasksCalendarPanel } from './AllTasksCalendarPanel';
import { AllTasksFiltersPanel } from './AllTasksFiltersPanel';
import { AllTasksNotePickerSheet } from './AllTasksNotePickerSheet';
import { AllTasksTaskRow } from './AllTasksTaskRow';

type Section = { id: TaskDeadlineBucket; title: string; data: TaskWithRecord[] };
type AllTasksViewMode = 'list' | 'calendar';

export const AllTasksScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AllTasks'>>();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { width: windowWidth } = useWindowDimensions();
  const [quickFilter, setQuickFilter] = useState<AllTasksQuickFilter>('all');
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  type EditTaskTarget = {
    recordId: string;
    taskId: string;
    text: string;
    deadline?: string | null;
    deadlineTime?: string | null;
    priority?: TaskItem['priority'];
  };

  const [editTaskTarget, setEditTaskTarget] = useState<EditTaskTarget | null>(null);
  type EditOutcomeTarget = {
    recordId: string;
    taskId: string;
    outcomeText: string;
  };
  const [editOutcomeTarget, setEditOutcomeTarget] = useState<EditOutcomeTarget | null>(null);

  const openEditTaskSheet = useCallback((target: EditTaskTarget) => {
    setEditTaskTarget((current) => {
      if (current === null) {
        return target;
      }
      requestAnimationFrame(() => {
        setEditTaskTarget(target);
      });
      return null;
    });
  }, []);

  const openEditOutcomeSheet = useCallback((target: EditOutcomeTarget) => {
    setEditOutcomeTarget((current) => {
      if (current === null) {
        return target;
      }
      requestAnimationFrame(() => {
        setEditOutcomeTarget(target);
      });
      return null;
    });
  }, []);

  const [notePickerVisible, setNotePickerVisible] = useState(false);
  const [createTaskRecordId, setCreateTaskRecordId] = useState<string | null>(null);
  const [createTaskFromPicker, setCreateTaskFromPicker] = useState(false);
  const [viewMode, setViewMode] = useState<AllTasksViewMode>('list');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());

  const listRef = useRef<FlashListRef<AllTasksListItem>>(null);

  const { records, updateTasks } = useRecordStore(
    useShallow((s) => ({
      records: s.records,
      updateTasks: s.updateTasks,
    })),
  );

  const recordFilterId = route.params?.recordId;
  const { addTaskToCalendar } = useAddToCalendar();
  const { addTaskToReminder } = useAddToReminder();

  const { activeFolderId, setActiveFolder } = useFolderStore(
    useShallow((s) => ({
      activeFolderId: s.activeFolderId,
      setActiveFolder: s.setActiveFolder,
    })),
  );

  const handleFolderSelect = useCallback(
    (id: string | null) => {
      setActiveFolder(id);
      if (id === null) {
        flashListJumpToTop(listRef.current ?? undefined);
      }
    },
    [setActiveFolder],
  );

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const foldersEnabled = areFoldersEnabledInAiMode(aiExecutionMode, privateAiProvider);
  const effectiveActiveFolderId = foldersEnabled ? activeFolderId : null;

  const { folders } = useManageFolders();

  const clearNoteFilter = useCallback(() => {
    navigation.setParams({ recordId: undefined });
  }, [navigation]);

  const noteFilterRecord = useMemo(
    () => (recordFilterId ? records.find((r) => r.id === recordFilterId) : undefined),
    [recordFilterId, records],
  );

  const eligibleNotesForCreate = useMemo(() => {
    let pool = records.filter((r) => r.status !== 'archived');
    if (effectiveActiveFolderId) {
      pool = pool.filter((r) => r.folderId === effectiveActiveFolderId);
    }
    return pool;
  }, [records, effectiveActiveFolderId]);

  const contentMaxWidth = useTabletContentMaxWidth('wide');
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const { adsAllowed } = useAdsAllowed();
  const filterPadH = isTablet ? 20 : 16;

  const showTaskUpdateError = useCallback(() => {
    Alert.alert(t('common.error'), t('allTasks.taskUpdateError'));
  }, [t]);

  const clearRecentlyCompleted = useCallback((taskId: string) => {
    if (timeoutsRef.current[taskId]) {
      clearTimeout(timeoutsRef.current[taskId]);
      delete timeoutsRef.current[taskId];
    }

    setRecentlyCompleted((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const markRecentlyCompleted = useCallback(
    (taskId: string) => {
      if (quickFilter === 'done') return;

      setRecentlyCompleted((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });

      timeoutsRef.current[taskId] = setTimeout(() => {
        clearRecentlyCompleted(taskId);
      }, 500);
    },
    [clearRecentlyCompleted, quickFilter],
  );

  const {
    outcomeTarget,
    linkedNoteContext,
    requestTaskToggle,
    closeOutcomeSheet,
    completeWithOutcome,
    completeAndSkip,
    startVoiceFollowUp,
    startTextFollowUp,
  } = useTaskCompletionFlow({
    navigation,
    onUpdateError: showTaskUpdateError,
    onTaskCompleted: markRecentlyCompleted,
  });

  const getFollowUpRecordTitle = useCallback(
    (recordId: string) => records.find((record) => record.id === recordId)?.title ?? null,
    [records],
  );

  const openFollowUpNote = useCallback(
    (recordId: string) => {
      const record = records.find((item) => item.id === recordId);
      if (!record) return;
      navigation.push('RecordingDetail', { record });
    },
    [navigation, records],
  );

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(timeoutsRef.current)) {
        clearTimeout(timeoutId);
      }
      timeoutsRef.current = {};
    };
  }, []);

  const taskRows = useMemo(
    () =>
      buildAllTasksRows(records, {
        effectiveActiveFolderId,
        recordFilterId,
        quickFilter,
        recentlyCompleted,
      }),
    [records, quickFilter, recentlyCompleted, effectiveActiveFolderId, recordFilterId],
  );

  const sectionList = useMemo(() => {
    const byBucket = new Map<TaskDeadlineBucket, TaskWithRecord[]>();
    for (const row of taskRows) {
      const key = getAllTasksListBucket(row.task);
      const list = byBucket.get(key) ?? [];
      list.push(row);
      byBucket.set(key, list);
    }

    const sections: Section[] = TASK_DEADLINE_BUCKET_ORDER.map((key) => ({
      id: key,
      title: t(`allTasks.sections.${key}`),
      data: [...(byBucket.get(key) ?? [])].sort(sortTaskRows),
    })).filter((section) => section.data.length > 0);

    return sections;
  }, [taskRows, t]);

  const calendarTaskCountsByDay = useMemo(() => buildTaskCountsByDeadlineDay(taskRows), [taskRows]);

  const calendarDayRows = useMemo(() => {
    const filtered = filterTasksByCalendarDate(taskRows, selectedCalendarDate);
    return [...filtered].sort(sortTaskRows);
  }, [taskRows, selectedCalendarDate]);

  const calendarListData = useMemo((): AllTasksListItem[] => {
    return calendarDayRows.map((row) => ({ type: 'task', row }));
  }, [calendarDayRows]);

  useEffect(() => {
    if (viewMode === 'calendar' && quickFilter === 'today') {
      setSelectedCalendarDate(new Date());
    }
  }, [quickFilter, viewMode]);

  useEffect(() => {
    flashListJumpToTop(listRef.current ?? undefined);
  }, [viewMode, selectedCalendarDate]);

  const flattenedList = useMemo((): AllTasksFlattenedItem[] => {
    const out: AllTasksFlattenedItem[] = [];
    for (let i = 0; i < sectionList.length; i++) {
      const s = sectionList[i];
      out.push({
        type: 'section',
        dayKey: s.id,
        title: s.title,
        isFirst: i === 0,
      });
      for (const row of s.data) {
        out.push({ type: 'task', row });
      }
    }
    return out;
  }, [sectionList]);

  const shouldInjectListBanner = adsAllowed && getHasSeenOnboarding();

  const listData = useMemo((): AllTasksListItem[] => {
    if (!shouldInjectListBanner) return flattenedList;
    return injectAllTasksListBannerCard(flattenedList);
  }, [flattenedList, shouldInjectListBanner]);

  const openNote = useCallback(
    (recordId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (record) navigation.navigate('RecordingDetail', { record });
    },
    [navigation, records],
  );

  const onToggle = useCallback(
    (recordId: string, taskId: string, currentlyDone: boolean) => {
      const record = records.find((item) => item.id === recordId);
      const task = record?.tasks?.find((item) => item.id === taskId);
      if (!record || !task) return;

      if (currentlyDone) {
        clearRecentlyCompleted(taskId);
      }

      requestTaskToggle(recordId, task);
    },
    [clearRecentlyCompleted, records, requestTaskToggle],
  );

  const openCreateTask = useCallback(() => {
    hapticSelection();
    if (eligibleNotesForCreate.length === 0) {
      Alert.alert(t('allTasks.createTaskNoNotesTitle'), t('allTasks.createTaskNoNotesMessage'));
      return;
    }
    if (recordFilterId) {
      const filteredRecord = records.find((r) => r.id === recordFilterId);
      if (!filteredRecord || filteredRecord.status === 'archived') {
        Alert.alert(t('allTasks.createTaskNoNotesTitle'), t('allTasks.noteUnavailable'));
        return;
      }
      setCreateTaskFromPicker(false);
      setCreateTaskRecordId(recordFilterId);
      return;
    }
    if (eligibleNotesForCreate.length === 1) {
      setCreateTaskFromPicker(false);
      setCreateTaskRecordId(eligibleNotesForCreate[0].id);
      return;
    }
    setCreateTaskFromPicker(false);
    setNotePickerVisible(true);
  }, [eligibleNotesForCreate, recordFilterId, records, t]);

  const closeCreateTaskSheet = useCallback(() => {
    setCreateTaskRecordId(null);
    setCreateTaskFromPicker(false);
  }, []);

  const backFromCreateTaskToNotePicker = useCallback(() => {
    setCreateTaskRecordId(null);
    setNotePickerVisible(true);
  }, []);

  const onCreateTask = useCallback(
    (
      recordId: string,
      nextValue: {
        text: string;
        deadline?: string | null;
        deadlineTime?: string | null;
        priority?: TaskItem['priority'];
      },
    ): boolean => {
      const trimmed = nextValue.text.trim();
      if (!trimmed) return false;

      const record = records.find((r) => r.id === recordId);
      if (!record) return false;

      const prev = record.tasks ?? [];
      const duplicate = prev.some((x) => x.text.trim().toLowerCase() === trimmed.toLowerCase());
      if (duplicate) {
        Alert.alert(t('recordingDetail.nextSteps'), t('recordingDetail.nextStepAlreadyInTasks'));
        return false;
      }

      const nextDeadline = nextValue.deadline?.trim() ?? '';
      const nextDeadlineTime = nextValue.deadlineTime?.trim() ?? '';
      const deadlineError = validateTaskDeadlineFields(nextDeadline, nextDeadlineTime);
      if (deadlineError) {
        Alert.alert(t('common.error'), t(taskDeadlineValidationErrorKey(deadlineError)));
        return false;
      }

      const taskId = `${recordId}-manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const next: TaskItem[] = [
        ...prev,
        {
          id: taskId,
          text: trimmed,
          isDone: false,
          source: 'manual',
          deadline: nextDeadline.length > 0 ? nextDeadline : null,
          deadlineTime:
            nextDeadline.length > 0 && nextDeadlineTime.length > 0 ? nextDeadlineTime : null,
          priority: nextValue.priority ?? 'medium',
        },
      ];
      void updateTasks(recordId, next).catch(() => {
        showTaskUpdateError();
      });
      return true;
    },
    [records, showTaskUpdateError, t, updateTasks],
  );

  const onEditTask = useCallback(
    (
      recordId: string,
      taskId: string,
      nextValue: {
        text: string;
        deadline?: string | null;
        deadlineTime?: string | null;
        priority?: TaskItem['priority'];
      },
    ): boolean => {
      const newText = nextValue.text;
      const trimmed = newText.trim();
      if (!trimmed) return false;

      const record = records.find((r) => r.id === recordId);
      if (!record) return false;

      const prev = record.tasks ?? [];
      const duplicate = prev.some(
        (x) => x.id !== taskId && x.text.trim().toLowerCase() === trimmed.toLowerCase(),
      );

      if (duplicate) {
        Alert.alert(t('recordingDetail.nextSteps'), t('recordingDetail.nextStepAlreadyInTasks'));
        return false;
      }

      const nextDeadline = nextValue.deadline?.trim() ?? '';
      const nextDeadlineTime = nextValue.deadlineTime?.trim() ?? '';
      const deadlineError = validateTaskDeadlineFields(nextDeadline, nextDeadlineTime);
      if (deadlineError) {
        Alert.alert(t('common.error'), t(taskDeadlineValidationErrorKey(deadlineError)));
        return false;
      }

      const next = prev.map((x) =>
        x.id === taskId
          ? {
              ...x,
              text: trimmed,
              deadline: nextDeadline.length > 0 ? nextDeadline : null,
              deadlineTime:
                nextDeadline.length > 0 && nextDeadlineTime.length > 0 ? nextDeadlineTime : null,
              priority: nextValue.priority ?? x.priority ?? 'medium',
            }
          : x,
      );
      void updateTasks(recordId, next).catch(() => {
        showTaskUpdateError();
      });

      return true;
    },
    [records, showTaskUpdateError, t, updateTasks],
  );

  const onEditTaskOutcome = useCallback(
    (recordId: string, taskId: string, outcomeText: string): boolean => {
      const record = records.find((r) => r.id === recordId);
      if (!record) return false;

      const prev = record.tasks ?? [];
      const next = prev.map((x) =>
        x.id === taskId ? { ...x, outcomeText: normalizeOutcomeText(outcomeText) } : x,
      );
      void updateTasks(recordId, next).catch(() => {
        showTaskUpdateError();
      });

      return true;
    },
    [records, showTaskUpdateError, updateTasks],
  );

  const onQuickSchedule = useCallback(
    (recordId: string, taskId: string, deadline: string) => {
      const record = records.find((r) => r.id === recordId);
      if (!record) return;

      const prev = record.tasks ?? [];
      const next = prev.map((x) =>
        x.id === taskId
          ? {
              ...x,
              deadline,
              deadlineTime: x.deadlineTime ?? null,
            }
          : x,
      );

      void updateTasks(recordId, next).catch(() => {
        showTaskUpdateError();
      });
    },
    [records, showTaskUpdateError, updateTasks],
  );

  const onDeleteTask = useCallback(
    (recordId: string, taskId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (!record) return;

      const prev = record.tasks ?? [];
      const next = prev.filter((x) => x.id !== taskId);
      void updateTasks(recordId, next).catch(() => {
        showTaskUpdateError();
      });
    },
    [records, showTaskUpdateError, updateTasks],
  );

  const onTogglePin = useCallback(
    (recordId: string, taskId: string, currentlyPinned: boolean) => {
      const record = records.find((r) => r.id === recordId);
      if (!record) return;

      const prev = record.tasks ?? [];
      const next = prev.map((x) => (x.id === taskId ? { ...x, isPinned: !currentlyPinned } : x));
      void updateTasks(recordId, next)
        .then(() => {
          if (!currentlyPinned && viewMode === 'list') {
            flashListJumpToTop(listRef.current ?? undefined);
          }
        })
        .catch(() => {
          showTaskUpdateError();
        });
    },
    [records, showTaskUpdateError, updateTasks, viewMode],
  );

  const showPermissionAlert = useCallback(
    (_: string) => {
      Alert.alert(t('common.error'), t('tasks.permissionDenied'));
    },
    [t],
  );

  const onAddTaskToReminder = useCallback(
    (item: TaskWithRecord) => {
      void addTaskToReminder(
        item.task,
        item.recordTitle,
        () => Alert.alert(t('tasks.addedToReminders')),
        showPermissionAlert,
      );
    },
    [addTaskToReminder, showPermissionAlert, t],
  );

  const onAddTaskToCalendar = useCallback(
    (item: TaskWithRecord) => {
      void addTaskToCalendar(
        item.task,
        item.recordTitle,
        () => Alert.alert(t('tasks.addedToCalendar')),
        showPermissionAlert,
      );
    },
    [addTaskToCalendar, showPermissionAlert, t],
  );

  const editTaskRecord = useMemo(
    () =>
      editTaskTarget ? records.find((record) => record.id === editTaskTarget.recordId) : undefined,
    [editTaskTarget, records],
  );

  const editTaskSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={editTaskTarget !== null}
        initialText={editTaskTarget?.text ?? ''}
        initialDeadline={editTaskTarget?.deadline}
        initialDeadlineTime={editTaskTarget?.deadlineTime}
        initialPriority={editTaskTarget?.priority}
        showMetadataFields={editTaskRecord?.status !== 'archived'}
        onClose={() => setEditTaskTarget(null)}
        onSave={(value) => {
          if (!editTaskTarget) return false;
          return onEditTask(editTaskTarget.recordId, editTaskTarget.taskId, value);
        }}
      />
    ),
    [editTaskRecord?.status, editTaskTarget, onEditTask],
  );

  const editOutcomeSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={editOutcomeTarget !== null}
        initialText={editOutcomeTarget?.outcomeText ?? ''}
        sheetTitleKey="taskOutcome.editOutcomeSheetTitle"
        placeholderKey="taskOutcome.outcomePlaceholder"
        textMaxChars={2000}
        allowEmptySave
        onClose={() => setEditOutcomeTarget(null)}
        onSave={({ text }) => {
          if (!editOutcomeTarget) return false;
          return onEditTaskOutcome(editOutcomeTarget.recordId, editOutcomeTarget.taskId, text);
        }}
      />
    ),
    [editOutcomeTarget, onEditTaskOutcome],
  );

  const createTaskLinkedNoteContext = useMemo(() => {
    if (!createTaskRecordId) return undefined;
    const record = records.find((r) => r.id === createTaskRecordId);
    if (!record) return undefined;
    const folder = record.folderId ? (folders.find((f) => f.id === record.folderId) ?? null) : null;
    return {
      title: record.title || t('record.autoTitle.morning'),
      folder,
      folderId: record.folderId,
      classification: record.classification,
    };
  }, [createTaskRecordId, folders, records, t]);

  const createTaskSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={createTaskRecordId !== null}
        initialText=""
        initialPriority="medium"
        showMetadataFields
        sheetTitleKey="tasks.createTaskSheetTitle"
        linkedNoteContext={createTaskLinkedNoteContext}
        onClose={closeCreateTaskSheet}
        onBack={createTaskFromPicker ? backFromCreateTaskToNotePicker : undefined}
        onSave={(value) => {
          if (!createTaskRecordId) return false;
          return onCreateTask(createTaskRecordId, value);
        }}
      />
    ),
    [
      backFromCreateTaskToNotePicker,
      closeCreateTaskSheet,
      createTaskFromPicker,
      createTaskLinkedNoteContext,
      createTaskRecordId,
      onCreateTask,
    ],
  );

  const toggleViewMode = useCallback(() => {
    hapticSelection();
    setViewMode((prev) => {
      if (prev === 'list') {
        setSelectedCalendarDate(new Date());
        return 'calendar';
      }
      return 'list';
    });
  }, []);

  const headerRightSlot = useMemo(
    () => (
      <FrostedHeaderButtonGroup color={color}>
        <HeaderIconButton
          inFrostedGroup
          iconOnly
          variant="icon"
          size="md"
          icon={
            <CalendarDays
              size={20}
              color={viewMode === 'calendar' ? color.accent.primary : color.text.primary}
              strokeWidth={2.2}
            />
          }
          color={color}
          onPress={toggleViewMode}
          accessibilityLabel={
            viewMode === 'calendar' ? t('allTasks.listViewA11y') : t('allTasks.calendarViewA11y')
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
        <HeaderIconButton
          inFrostedGroup
          iconOnly
          variant="icon"
          size="md"
          icon={<Plus size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={openCreateTask}
          accessibilityLabel={t('allTasks.createTaskA11y')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
      </FrostedHeaderButtonGroup>
    ),
    [color, openCreateTask, t, toggleViewMode, viewMode],
  );

  const renderListItem = useCallback(
    ({ item }: { item: AllTasksListItem }) => {
      if (item.type === 'section') {
        return <SectionHeader title={item.title} isFirst={item.isFirst} />;
      }
      if (item.type === 'banner_card') {
        return <InboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} variant="card" />;
      }
      return (
        <AllTasksTaskRow
          item={item.row}
          color={color}
          compactHorizontalMargin={isTablet}
          openNoteLabel={t('allTasks.openNote')}
          onToggle={onToggle}
          getFollowUpRecordTitle={getFollowUpRecordTitle}
          onOpenFollowUp={openFollowUpNote}
          onOpenNote={openNote}
          onEditTask={(recordId, taskId, text) => {
            openEditTaskSheet({
              recordId,
              taskId,
              text,
              deadline: item.row.task.deadline,
              deadlineTime: item.row.task.deadlineTime,
              priority: item.row.task.priority,
            });
          }}
          onEditTaskOutcome={(recordId, taskId, outcomeText) => {
            openEditOutcomeSheet({ recordId, taskId, outcomeText });
          }}
          onQuickSchedule={onQuickSchedule}
          onAddToReminder={onAddTaskToReminder}
          onAddToCalendar={onAddTaskToCalendar}
          onTogglePin={onTogglePin}
          onDeleteTask={(recordId, taskId) => {
            Alert.alert(t('tasks.deleteTask'), t('tasks.deleteTaskConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('tasks.deleteTask'),
                style: 'destructive',
                onPress: () => onDeleteTask(recordId, taskId),
              },
            ]);
          }}
        />
      );
    },
    [
      bannerMaxWidth,
      color,
      onToggle,
      getFollowUpRecordTitle,
      openFollowUpNote,
      openNote,
      openEditTaskSheet,
      openEditOutcomeSheet,
      onAddTaskToReminder,
      onAddTaskToCalendar,
      t,
      onDeleteTask,
      onTogglePin,
      onQuickSchedule,
      isTablet,
    ],
  );

  const keyExtractor = useCallback((item: AllTasksListItem) => {
    if (item.type === 'section') {
      return `section-${item.dayKey}`;
    }
    if (item.type === 'banner_card') {
      return `all-tasks-inline-banner-${item.slotIndex}`;
    }
    return `${item.row.recordId}-${item.row.task.id}`;
  }, []);

  const getItemType = useCallback((item: AllTasksListItem) => item.type, []);

  const listEmpty =
    sectionList.length === 0 || sectionList.every((section) => section.data.length === 0);
  const calendarEmpty = calendarDayRows.length === 0;
  const empty = viewMode === 'calendar' ? calendarEmpty : listEmpty;
  const activeListData = viewMode === 'calendar' ? calendarListData : listData;

  return (
    <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('allTasks.title')}
        onBack={() => navigation.goBack()}
        rightSlot={headerRightSlot}
      />
      <AllTasksFiltersPanel
        color={color}
        activeFilter={quickFilter}
        foldersEnabled={foldersEnabled}
        folders={folders}
        activeFolderId={effectiveActiveFolderId}
        onFilterSelect={setQuickFilter}
        onFolderSelect={handleFolderSelect}
      />

      {recordFilterId ? (
        <View
          style={{
            backgroundColor: color.background.primary,
            borderBottomWidth: 1,
            borderBottomColor: color.border.default,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: '100%',
              maxWidth: contentMaxWidth,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: filterPadH,
              paddingVertical: 10,
              gap: 10,
            }}
          >
            <View
              className="min-w-0 flex-1 flex-row items-center rounded-xl px-3 py-4"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <Text
                style={{
                  color: color.text.secondary,
                  fontSize: 12,
                  fontWeight: '600',
                  marginRight: 6,
                }}
              >
                {t('allTasks.noteFilterLabel')}
              </Text>
              <Text
                className="min-w-0 flex-1 shrink"
                style={{ color: color.text.primary, fontSize: 14, fontWeight: '500' }}
                numberOfLines={1}
              >
                {noteFilterRecord?.title ?? t('allTasks.noteUnavailable')}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                hapticSelection();
                clearNoteFilter();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('allTasks.clearNoteFilterA11y')}
              style={{ padding: 8 }}
            >
              <X size={20} color={color.text.secondary} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {viewMode === 'calendar' ? (
        <AllTasksCalendarPanel
          color={color}
          selectedDate={selectedCalendarDate}
          tasksCount={calendarDayRows.length}
          taskCountsByDay={calendarTaskCountsByDay}
          onDateChange={setSelectedCalendarDate}
          compactHorizontalMargin={isTablet}
          maxWidth={contentMaxWidth}
        />
      ) : null}

      {empty ? (
        <View
          className="flex-1"
          style={{
            maxWidth: bannerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
        >
          <View className="flex-1 justify-center px-6">
            <EmptyState
              title={
                viewMode === 'calendar'
                  ? t('allTasks.emptyCalendarDate')
                  : quickFilter !== 'all'
                    ? t('allTasks.emptyQuickFilter')
                    : t('allTasks.emptyFiltered')
              }
              description={t('allTasks.emptyDescription')}
            />
          </View>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} density="compact" />
        </View>
      ) : (
        <FlashList<AllTasksListItem>
          ref={listRef}
          data={activeListData}
          renderItem={renderListItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          contentContainerStyle={{
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
            paddingHorizontal: isTablet ? 12 : 0,
            paddingTop: 8,
          }}
          style={{
            flex: 1,
            backgroundColor: color.background.secondary,
            alignSelf: 'center',
            width: '100%',
            maxWidth: contentMaxWidth,
          }}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ disabled: true }}
        />
      )}
      <AllTasksNotePickerSheet
        visible={notePickerVisible}
        records={eligibleNotesForCreate}
        folders={folders}
        onClose={() => setNotePickerVisible(false)}
        onSelect={(recordId) => {
          setNotePickerVisible(false);
          setCreateTaskFromPicker(true);
          setCreateTaskRecordId(recordId);
        }}
      />
      {editTaskSheet}
      {editOutcomeSheet}
      {createTaskSheet}
      <TaskOutcomeSheet
        visible={outcomeTarget !== null}
        task={outcomeTarget?.task ?? null}
        linkedNoteContext={linkedNoteContext}
        onClose={closeOutcomeSheet}
        onComplete={completeWithOutcome}
        onSkip={completeAndSkip}
        onVoiceFollowUp={startVoiceFollowUp}
        onTextFollowUp={startTextFollowUp}
      />
    </View>
  );
};
