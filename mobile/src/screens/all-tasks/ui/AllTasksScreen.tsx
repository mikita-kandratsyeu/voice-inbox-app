import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { X } from 'lucide-react-native';
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
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
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
import { resolveDayjsLocale } from '@/shared/lib/date';
import { EmptyState, ScreenHeader, SectionHeader } from '@/shared/ui';

import {
  type AllTasksFlattenedItem,
  type AllTasksListItem,
  injectAllTasksListBannerCard,
} from '../lib/injectAllTasksListBannerCard';
import type { TaskWithRecord } from '../types';
import { AllTasksTaskRow } from './AllTasksTaskRow';

const dayKeyFromMs = (ms: number): string => dayjs(ms).format('YYYY-MM-DD');
const dayKeyFromIso = (iso: string): string => dayjs(iso).format('YYYY-MM-DD');

type Section = { dayKey: string; title: string; data: TaskWithRecord[] };

export const AllTasksScreen = () => {
  const { t, i18n } = useTranslation();
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
  } | null>(null);

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

  const contentMaxWidth = useTabletContentMaxWidth();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const { adsAllowed } = useAdsAllowed();
  const filterPadH = isTablet ? 24 : 16;
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

    const todayK = dayKeyFromMs(Date.now());
    const yesterdayK = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const byDay = new Map<string, TaskWithRecord[]>();
    for (const row of filtered) {
      const key = dayKeyFromIso(row.recordCreatedAt);
      const list = byDay.get(key) ?? [];
      list.push(row);
      byDay.set(key, list);
    }

    const keys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

    const formatLong = (key: string): string => {
      return dayjs(key).locale(resolveDayjsLocale(i18n.language)).format('dddd, D MMMM YYYY');
    };

    const sections: Section[] = keys.map((key) => {
      let title = formatLong(key);
      if (key === todayK) title = t('allTasks.today');
      else if (key === yesterdayK) title = t('allTasks.yesterday');

      return {
        dayKey: key,
        title,
        data: byDay.get(key) ?? [],
      };
    });

    return sections;
  }, [
    records,
    openOnly,
    i18n.language,
    t,
    recentlyCompleted,
    effectiveActiveFolderId,
    recordFilterId,
  ]);

  const flattenedList = useMemo((): AllTasksFlattenedItem[] => {
    const out: AllTasksFlattenedItem[] = [];
    for (let i = 0; i < sectionList.length; i++) {
      const s = sectionList[i];
      out.push({
        type: 'section',
        dayKey: s.dayKey,
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

  const onEditTask = useCallback(
    (recordId: string, taskId: string, newText: string): boolean => {
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

      const next = prev.map((x) => (x.id === taskId ? { ...x, text: trimmed } : x));
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

  const editTaskSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={editTaskTarget !== null}
        initialText={editTaskTarget?.text ?? ''}
        onClose={() => setEditTaskTarget(null)}
        onSave={(text) => {
          if (!editTaskTarget) return false;
          return onEditTask(editTaskTarget.recordId, editTaskTarget.taskId, text);
        }}
      />
    ),
    [editTaskTarget, onEditTask],
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
          openNoteLabel={t('allTasks.openNote')}
          onToggle={onToggle}
          onOpenNote={openNote}
          onEditTask={(recordId, taskId, text) => {
            setEditTaskTarget({ recordId, taskId, text });
          }}
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
    [bannerMaxWidth, color, onToggle, openNote, t, onDeleteTask],
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
      <ScreenHeader title={t('allTasks.title')} onBack={() => navigation.goBack()} />
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
            justifyContent: 'space-between',
            paddingHorizontal: filterPadH,
            paddingVertical: filterPadV,
            gap: isTablet ? 20 : 12,
          }}
        >
          <Text
            className="flex-1"
            style={{
              color: color.text.primary,
              fontSize: isTablet ? 16 : 14,
              fontWeight: isTablet ? '500' : '400',
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
      {editTaskSheet}
    </View>
  );
};
