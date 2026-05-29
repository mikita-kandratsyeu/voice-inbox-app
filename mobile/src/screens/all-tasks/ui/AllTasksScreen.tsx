import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { Plus, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { RootStackParamList } from '@/app/navigation/types';
import {
  FolderChipBar,
  FolderFormModal,
  FolderReorderSheet,
  useFolderStore,
} from '@/entities/folder';
import { type TaskItem, useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAddToCalendar } from '@/features/add-to-calendar';
import { useAddToReminder } from '@/features/add-to-reminder';
import { useAdsAllowed } from '@/features/app-storefront';
import { DeferredInboxBannerAd, InboxBannerAd } from '@/features/inbox-banner';
import { useManageFolders } from '@/features/manage-folders';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { TaskEditSheet } from '@/screens/recording-detail/ui/TaskEditSheet';
import { useColors } from '@/shared/config';
import {
  flashListJumpToTop,
  hapticSelection,
  useIsTablet,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';
import { Button, EmptyState, HeaderIconButton, ScreenHeader, SectionHeader } from '@/shared/ui';

import {
  type AllTasksFlattenedItem,
  type AllTasksListItem,
  injectAllTasksListBannerCard,
} from '../lib/injectAllTasksListBannerCard';
import type { TaskDeadlineBucket, TaskWithRecord } from '../types';
import { AllTasksNotePickerSheet } from './AllTasksNotePickerSheet';
import { AllTasksTaskRow } from './AllTasksTaskRow';

const TASK_DEADLINE_BUCKETS: TaskDeadlineBucket[] = [
  'overdue',
  'today',
  'upcoming',
  'noDate',
  'done',
];

const PRIORITY_RANK: Record<NonNullable<TaskItem['priority']>, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

type Section = { id: TaskDeadlineBucket; title: string; data: TaskWithRecord[] };

const getDeadlineBucket = (task: TaskItem): TaskDeadlineBucket => {
  if (task.isDone) return 'done';
  const deadline = parseTaskDeadline(task.deadline);
  if (!deadline) return 'noDate';
  const day = dayjs(deadline);
  if (day.isBefore(dayjs(), 'day')) return 'overdue';
  if (day.isSame(dayjs(), 'day')) return 'today';
  return 'upcoming';
};

const getTaskDeadlineSortTime = (task: TaskItem): number => {
  const deadline = parseTaskDeadline(task.deadline);
  if (!deadline) return Number.POSITIVE_INFINITY;

  const match = /^(\d{2}):(\d{2})$/.exec(task.deadlineTime ?? '');
  if (!match) return deadline.getTime();

  return new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
    Number(match[1]),
    Number(match[2]),
  ).getTime();
};

const sortTaskRows = (a: TaskWithRecord, b: TaskWithRecord): number => {
  const deadlineA = getTaskDeadlineSortTime(a.task);
  const deadlineB = getTaskDeadlineSortTime(b.task);
  if (deadlineA !== deadlineB) return deadlineA - deadlineB;

  const priorityA = a.task.priority ? PRIORITY_RANK[a.task.priority] : PRIORITY_RANK.medium;
  const priorityB = b.task.priority ? PRIORITY_RANK[b.task.priority] : PRIORITY_RANK.medium;
  if (priorityA !== priorityB) return priorityA - priorityB;

  return dayjs(b.recordCreatedAt).valueOf() - dayjs(a.recordCreatedAt).valueOf();
};

const isValidDeadlineInput = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DD') === value;
};

const isPastDeadlineInput = (value: string): boolean => dayjs(value).isBefore(dayjs(), 'day');

const isValidDeadlineTimeInput = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const isPastDeadlineDateTimeInput = (deadline: string, deadlineTime: string): boolean => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(deadlineTime);
  if (!dateMatch || !timeMatch) return false;

  const value = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );

  return value.getTime() <= Date.now();
};

export const AllTasksScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AllTasks'>>();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { width: windowWidth } = useWindowDimensions();
  const [openOnly, setOpenOnly] = useState(true);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [editTaskTarget, setEditTaskTarget] = useState<{
    recordId: string;
    taskId: string;
    text: string;
    deadline?: string | null;
    deadlineTime?: string | null;
    priority?: TaskItem['priority'];
  } | null>(null);
  const [notePickerVisible, setNotePickerVisible] = useState(false);
  const [createTaskRecordId, setCreateTaskRecordId] = useState<string | null>(null);
  const [createTaskFromPicker, setCreateTaskFromPicker] = useState(false);

  const listRef = useRef<FlashListRef<AllTasksListItem>>(null);
  const folderChipScrollRef = useRef<ScrollView>(null);

  const { records, toggleTask, updateTasks } = useRecordStore(
    useShallow((s) => ({
      records: s.records,
      toggleTask: s.toggleTask,
      updateTasks: s.updateTasks,
    })),
  );

  const recordFilterId = route.params?.recordId;
  const { addTaskToCalendar } = useAddToCalendar();
  const { addTaskToReminder } = useAddToReminder();

  const { activeFolderId, setActiveFolder, reorderFolders } = useFolderStore(
    useShallow((s) => ({
      activeFolderId: s.activeFolderId,
      setActiveFolder: s.setActiveFolder,
      reorderFolders: s.reorderFolders,
    })),
  );

  const handleFolderSelect = useCallback(
    (id: string | null) => {
      setActiveFolder(id);
      if (id === null) {
        folderChipScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
        flashListJumpToTop(listRef.current ?? undefined);
      }
    },
    [setActiveFolder],
  );

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const effectiveActiveFolderId = isPrivateMode ? null : activeFolderId;

  const {
    folders,
    modalVisible: folderModalVisible,
    editingFolder,
    openCreateModal: openCreateFolderModal,
    openEditModal: openEditFolderModal,
    closeModal: closeFolderModal,
    handleSave: handleFolderSave,
    handleDelete: handleFolderDelete,
  } = useManageFolders();

  const [folderReorderVisible, setFolderReorderVisible] = useState(false);

  const handleFoldersReorder = useCallback(
    (orderedIds: string[]) => {
      void reorderFolders(orderedIds);
    },
    [reorderFolders],
  );

  const openFolderReorderSheet = useCallback(() => setFolderReorderVisible(true), []);
  const closeFolderReorderSheet = useCallback(() => setFolderReorderVisible(false), []);

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
  const filterPadV = isTablet ? 14 : 10;

  const sectionList = useMemo(() => {
    let pool = [...records]
      .filter((r) => r.status !== 'archived')
      .filter((r) => (r.tasks?.length ?? 0) > 0);

    if (effectiveActiveFolderId) {
      pool = pool.filter((r) => r.folderId === effectiveActiveFolderId);
    }
    if (recordFilterId) {
      pool = pool.filter((r) => r.id === recordFilterId);
    }

    const sorted = pool.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

    const rows: TaskWithRecord[] = [];
    for (const r of sorted) {
      for (const task of r.tasks ?? []) {
        rows.push({
          recordId: r.id,
          recordTitle: r.title,
          recordCreatedAt: r.createdAt,
          task,
        });
      }
    }

    const filtered = openOnly
      ? rows.filter((row) => !row.task.isDone || recentlyCompleted.has(row.task.id))
      : rows;

    const byBucket = new Map<TaskDeadlineBucket, TaskWithRecord[]>();
    for (const row of filtered) {
      const key = getDeadlineBucket(row.task);
      const list = byBucket.get(key) ?? [];
      list.push(row);
      byBucket.set(key, list);
    }

    const sections: Section[] = TASK_DEADLINE_BUCKETS.map((key) => ({
      id: key,
      title: t(`allTasks.sections.${key}`),
      data: [...(byBucket.get(key) ?? [])].sort(sortTaskRows),
    })).filter((section) => section.data.length > 0);

    return sections;
  }, [records, openOnly, t, recentlyCompleted, effectiveActiveFolderId, recordFilterId]);

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
      toggleTask(recordId, taskId).catch(() => {});

      if (!currentlyDone && openOnly) {
        setRecentlyCompleted((prev) => {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        });

        timeoutsRef.current[taskId] = setTimeout(() => {
          setRecentlyCompleted((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          delete timeoutsRef.current[taskId];
        }, 500);
      } else if (currentlyDone && openOnly) {
        if (timeoutsRef.current[taskId]) {
          clearTimeout(timeoutsRef.current[taskId]);
          delete timeoutsRef.current[taskId];

          setRecentlyCompleted((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
        }
      }
    },
    [toggleTask, openOnly],
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
      if (nextDeadline.length > 0 && !isValidDeadlineInput(nextDeadline)) {
        Alert.alert(t('common.error'), t('tasks.deadlineInvalid'));
        return false;
      }
      if (nextDeadlineTime.length > 0 && !isValidDeadlineTimeInput(nextDeadlineTime)) {
        Alert.alert(t('common.error'), t('tasks.deadlineInvalid'));
        return false;
      }
      if (nextDeadline.length > 0 && isPastDeadlineInput(nextDeadline)) {
        Alert.alert(t('common.error'), t('tasks.deadlinePastInvalid'));
        return false;
      }
      if (
        nextDeadline.length > 0 &&
        nextDeadlineTime.length > 0 &&
        isPastDeadlineDateTimeInput(nextDeadline, nextDeadlineTime)
      ) {
        Alert.alert(t('common.error'), t('tasks.deadlineTimePastInvalid'));
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
      updateTasks(recordId, next).catch(() => {});
      return true;
    },
    [records, t, updateTasks],
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
      if (nextDeadline.length > 0 && !isValidDeadlineInput(nextDeadline)) {
        Alert.alert(t('common.error'), t('tasks.deadlineInvalid'));
        return false;
      }
      if (nextDeadlineTime.length > 0 && !isValidDeadlineTimeInput(nextDeadlineTime)) {
        Alert.alert(t('common.error'), t('tasks.deadlineInvalid'));
        return false;
      }
      if (nextDeadline.length > 0 && isPastDeadlineInput(nextDeadline)) {
        Alert.alert(t('common.error'), t('tasks.deadlinePastInvalid'));
        return false;
      }
      if (
        nextDeadline.length > 0 &&
        nextDeadlineTime.length > 0 &&
        isPastDeadlineDateTimeInput(nextDeadline, nextDeadlineTime)
      ) {
        Alert.alert(t('common.error'), t('tasks.deadlineTimePastInvalid'));
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
      updateTasks(recordId, next).catch(() => {});

      return true;
    },
    [records, t, updateTasks],
  );

  const onDeleteTask = useCallback(
    (recordId: string, taskId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (!record) return;

      const prev = record.tasks ?? [];
      const next = prev.filter((x) => x.id !== taskId);
      updateTasks(recordId, next).catch(() => {});
    },
    [records, updateTasks],
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

  const editTaskSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={editTaskTarget !== null}
        initialText={editTaskTarget?.text ?? ''}
        initialDeadline={editTaskTarget?.deadline}
        initialDeadlineTime={editTaskTarget?.deadlineTime}
        initialPriority={editTaskTarget?.priority}
        showMetadataFields
        onClose={() => setEditTaskTarget(null)}
        onSave={(value) => {
          if (!editTaskTarget) return false;
          return onEditTask(editTaskTarget.recordId, editTaskTarget.taskId, value);
        }}
      />
    ),
    [editTaskTarget, onEditTask],
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

  const headerRightSlot = useMemo(
    () =>
      recordFilterId ? null : (
        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<Plus size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={openCreateTask}
          accessibilityLabel={t('allTasks.createTaskA11y')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
      ),
    [color, openCreateTask, recordFilterId, t],
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
          onOpenNote={openNote}
          onEditTask={(recordId, taskId, text) => {
            setEditTaskTarget({
              recordId,
              taskId,
              text,
              deadline: item.row.task.deadline,
              deadlineTime: item.row.task.deadlineTime,
              priority: item.row.task.priority,
            });
          }}
          onAddToReminder={onAddTaskToReminder}
          onAddToCalendar={onAddTaskToCalendar}
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
      openNote,
      onAddTaskToReminder,
      onAddTaskToCalendar,
      t,
      onDeleteTask,
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

  const empty = sectionList.length === 0 || sectionList.every((s) => s.data.length === 0);

  return (
    <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('allTasks.title')}
        onBack={() => navigation.goBack()}
        rightSlot={headerRightSlot}
      />
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
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: filterPadH,
            paddingVertical: filterPadV,
            gap: isTablet ? 14 : 12,
          }}
        >
          <Text
            style={{
              color: color.text.primary,
              fontSize: isTablet ? 16 : 14,
              fontWeight: isTablet ? '500' : '400',
              flex: isTablet ? 0 : 1,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {t('allTasks.openOnly')}
          </Text>
          <Switch
            value={openOnly}
            onValueChange={(v) => {
              hapticSelection();
              setOpenOnly(v);
            }}
            accessibilityLabel={t('allTasks.openOnly')}
            trackColor={{ false: color.background.tertiary, true: color.accent.primary }}
            thumbColor={color.icon.onAccent}
            style={isTablet ? { transform: [{ scale: 1.12 }] } : undefined}
          />
        </View>
      </View>

      {!isPrivateMode && (
        <FolderChipBar
          folders={folders}
          activeFolderId={effectiveActiveFolderId}
          color={color}
          onSelect={handleFolderSelect}
          onCreatePress={openCreateFolderModal}
          onEditPress={openEditFolderModal}
          onReorderPress={openFolderReorderSheet}
          scrollRef={folderChipScrollRef}
        />
      )}

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
              className="min-w-0 flex-1 flex-row items-center rounded-xl px-3 py-2"
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
              title={openOnly ? t('allTasks.emptyFiltered') : t('allTasks.emptyTitle')}
              description={t('allTasks.emptyDescription')}
            />
            <View className="mt-6 items-center px-2">
              <Button
                variant="primary"
                size="lg"
                label={t('allTasks.createTask')}
                color={color}
                onPress={openCreateTask}
              />
            </View>
          </View>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} density="compact" />
        </View>
      ) : (
        <FlashList<AllTasksListItem>
          ref={listRef}
          data={listData}
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
      {!isPrivateMode && (
        <FolderReorderSheet
          visible={folderReorderVisible}
          folders={folders}
          onClose={closeFolderReorderSheet}
          onReorder={handleFoldersReorder}
        />
      )}
      {!isPrivateMode && (
        <FolderFormModal
          visible={folderModalVisible}
          folder={editingFolder}
          onSave={handleFolderSave}
          onDelete={editingFolder ? () => handleFolderDelete(editingFolder.id) : undefined}
          onClose={closeFolderModal}
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
      {createTaskSheet}
    </View>
  );
};
