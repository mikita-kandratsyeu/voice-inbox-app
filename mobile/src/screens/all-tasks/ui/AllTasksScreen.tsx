import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import { InboxBannerAd } from '@/features/inbox-banner';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { EmptyState, ScreenHeader, SectionHeader } from '@/shared/ui';

import type { TaskWithRecord } from '../types';
import { AllTasksTaskRow } from './AllTasksTaskRow';

const pad2 = (n: number) => String(n).padStart(2, '0');

const dayKeyFromMs = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const dayKeyFromIso = (iso: string): string => dayKeyFromMs(new Date(iso).getTime());

type Section = { dayKey: string; title: string; data: TaskWithRecord[] };

export const AllTasksScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { width: windowWidth } = useWindowDimensions();
  const [openOnly, setOpenOnly] = useState(true);

  const { records, toggleTask } = useRecordStore(
    useShallow((s) => ({
      records: s.records,
      toggleTask: s.toggleTask,
    })),
  );

  const contentMaxWidth = useTabletContentMaxWidth();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const filterPadH = isTablet ? 24 : 16;
  const filterPadV = isTablet ? 14 : 10;

  const sectionList = useMemo(() => {
    const sorted = [...records]
      .filter((r) => r.status !== 'archived')
      .filter((r) => (r.tasks?.length ?? 0) > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

    const filtered = openOnly ? rows.filter((row) => !row.task.isDone) : rows;

    const todayK = dayKeyFromMs(Date.now());
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayK = dayKeyFromMs(y.getTime());

    const byDay = new Map<string, TaskWithRecord[]>();
    for (const row of filtered) {
      const key = dayKeyFromIso(row.recordCreatedAt);
      const list = byDay.get(key) ?? [];
      list.push(row);
      byDay.set(key, list);
    }

    const keys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

    const formatLong = (key: string): string => {
      const [yy, mm, dd] = key.split('-').map(Number);
      const date = new Date(yy, mm - 1, dd);
      return date.toLocaleDateString(i18n.language, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
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
  }, [records, openOnly, i18n.language, t]);

  const openNote = useCallback(
    (recordId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (record) navigation.navigate('RecordingDetail', { record });
    },
    [navigation, records],
  );

  const onToggle = useCallback(
    (recordId: string, taskId: string) => {
      toggleTask(recordId, taskId).catch(() => {});
    },
    [toggleTask],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      const isFirst = sectionList[0]?.dayKey === section.dayKey;
      return <SectionHeader title={section.title} isFirst={isFirst} />;
    },
    [sectionList],
  );

  const renderItem = useCallback(
    ({ item }: { item: TaskWithRecord }) => (
      <AllTasksTaskRow
        item={item}
        color={color}
        openNoteLabel={t('allTasks.openNote')}
        onToggle={onToggle}
        onOpenNote={openNote}
      />
    ),
    [color, onToggle, openNote, t],
  );

  const keyExtractor = useCallback(
    (item: TaskWithRecord) => `${item.recordId}-${item.task.id}`,
    [],
  );

  const empty = sectionList.length === 0 || sectionList.every((s) => s.data.length === 0);

  const listFooter = (
    <View style={{ paddingBottom: insets.bottom }}>
      <InboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} density="compact" />
    </View>
  );

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
            onValueChange={setOpenOnly}
            trackColor={{ false: color.background.tertiary, true: color.accent.primary }}
            thumbColor={color.icon.onAccent}
            style={isTablet ? { transform: [{ scale: 1.12 }] } : undefined}
          />
        </View>
      </View>

      {empty ? (
        <View
          className="flex-1"
          style={{ maxWidth: bannerMaxWidth, alignSelf: 'center', width: '100%' }}
        >
          <View className="flex-1 justify-center px-6">
            <EmptyState
              title={openOnly ? t('allTasks.emptyFiltered') : t('allTasks.emptyTitle')}
              description={t('allTasks.emptyDescription')}
            />
          </View>
          <InboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} density="compact" />
        </View>
      ) : (
        <SectionList<TaskWithRecord, Section>
          sections={sectionList}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={{
            paddingBottom: 24,
            paddingTop: 8,
          }}
          stickySectionHeadersEnabled={false}
          style={{
            flex: 1,
            backgroundColor: color.background.secondary,
            alignSelf: 'center',
            width: '100%',
            maxWidth: contentMaxWidth,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};
