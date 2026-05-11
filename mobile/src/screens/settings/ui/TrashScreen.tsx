import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import type { TrashedRecordListItem } from '@/entities/record/model/repository';
import { recordRepository } from '@/entities/record/model/repository';
import { useRecordStore } from '@/entities/record/model/store';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useColors } from '@/shared/config';
import {
  formatFileSize,
  hapticSelection,
  IS_ANDROID,
  sumAudioFileSizesBytes,
  useIsTablet,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import {
  BlockingProgressModal,
  Button,
  EmptyState,
  SCREEN_PADDING,
  ScreenHeader,
} from '@/shared/ui';

const TRASH_RESTORE_BTN_H = 48;

function trashedRecordDescription(item: TrashedRecordListItem): string | null {
  const fromTranscript = item.transcript?.trim();
  if (fromTranscript) return fromTranscript;
  const fromSummary = item.summary?.trim();
  if (fromSummary) return fromSummary;
  return null;
}

export const TrashScreen = () => {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const restoreRecordFromTrash = useRecordStore((s) => s.restoreRecordFromTrash);
  const purgeRecordPermanently = useRecordStore((s) => s.purgeRecordPermanently);

  const [items, setItems] = useState<TrashedRecordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashAudioBytes, setTrashAudioBytes] = useState(0);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [emptyTrashProgress, setEmptyTrashProgress] = useState({ current: 0, total: 0 });

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const list = await recordRepository.getTrashedList();
      const bytes = await sumAudioFileSizesBytes(list.map((i) => i.audioPath));
      setTrashAudioBytes(bytes);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTrash();
    }, [loadTrash]),
  );

  const formatPurgeDate = useCallback(
    (iso: string) => {
      const loc = resolveDayjsLocale(i18n.language);
      return dayjs(iso).locale(loc).format('D MMM YYYY');
    },
    [i18n.language],
  );

  const onRestore = useCallback(
    (item: TrashedRecordListItem) => {
      Alert.alert(t('trash.restoreTitle'), t('trash.restoreMessage', { title: item.title }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('trash.restoreConfirm'),
          onPress: () => {
            void (async () => {
              hapticSelection();
              await restoreRecordFromTrash(item.id);
              await loadTrash();
            })();
          },
        },
      ]);
    },
    [loadTrash, restoreRecordFromTrash, t],
  );

  const onDeleteForever = useCallback(
    (item: TrashedRecordListItem) => {
      Alert.alert(
        t('trash.deleteForeverTitle'),
        t('trash.deleteForeverMessage', { title: item.title }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('trash.deleteForeverConfirm'),
            style: 'destructive',
            onPress: () => {
              void (async () => {
                hapticSelection();
                await purgeRecordPermanently(item.id);
                await loadTrash();
              })();
            },
          },
        ],
      );
    },
    [loadTrash, purgeRecordPermanently, t],
  );

  const onEmptyTrash = useCallback(() => {
    const count = items.length;
    if (count === 0) return;
    Alert.alert(t('trash.emptyTrashTitle'), t('trash.emptyTrashMessage', { count }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('trash.emptyTrashConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            hapticSelection();
            const list = await recordRepository.getTrashedList();
            if (list.length === 0) {
              await loadTrash();
              return;
            }
            setIsEmptyingTrash(true);
            setEmptyTrashProgress({ current: 0, total: list.length });
            try {
              for (let i = 0; i < list.length; i += 1) {
                await purgeRecordPermanently(list[i]!.id);
                setEmptyTrashProgress({ current: i + 1, total: list.length });
              }
              await loadTrash();
            } catch {
              Alert.alert(t('common.error'), t('trash.emptyTrashError'));
            } finally {
              setIsEmptyingTrash(false);
              setEmptyTrashProgress({ current: 0, total: 0 });
            }
          })();
        },
      },
    ]);
  }, [items.length, loadTrash, purgeRecordPermanently, t]);

  const maxW = contentMaxWidth ?? windowWidth;
  const bannerMaxWidth = maxW;

  const renderListFooter = useCallback(
    () => (
      <View style={{ marginTop: 8 }}>
        <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
      </View>
    ),
    [bannerMaxWidth, color],
  );

  const renderListHeader = useCallback(
    () => (
      <View className="mb-4">
        <Text className="text-[14px] leading-5" style={{ color: color.text.secondary }}>
          {t('trash.intro')}
        </Text>
        {!loading ? (
          <View style={{ marginTop: 12, gap: 4 }}>
            <Text className="text-[14px] leading-5" style={{ color: color.text.muted }}>
              {t('trash.audioInTrash', { size: formatFileSize(trashAudioBytes) })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('storage.title')}
              onPress={() => navigation.navigate('StorageDetails')}
              style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
            >
              <Text className="text-[15px] font-semibold" style={{ color: color.accent.primary }}>
                {t('storage.title')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ),
    [color, loading, navigation, t, trashAudioBytes],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('trash.title')}
        onBack={() => navigation.goBack()}
        rightSlot={
          !loading && items.length > 0 && !isEmptyingTrash ? (
            <Button
              iconOnly
              variant="icon"
              size="md"
              accessibilityLabel={t('trash.emptyTrashAction')}
              icon={<Trash2 size={22} color={color.accent.delete} strokeWidth={2} />}
              color={color}
              onPress={onEmptyTrash}
            />
          ) : null
        }
      />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: maxW,
        }}
      >
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: 16,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
            flexGrow: 1,
          }}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-16">
                <ActivityIndicator color={color.accent.primary} />
              </View>
            ) : (
              <View className="min-h-[320px] flex-1 justify-center py-8">
                <EmptyState
                  title={t('trash.empty')}
                  icon={<Trash2 size={40} color={color.icon.muted} strokeWidth={1.5} />}
                />
              </View>
            )
          }
          renderItem={({ item }) => {
            const preview = trashedRecordDescription(item);
            return (
              <View
                className="mb-3 overflow-hidden rounded-2xl border px-4 py-3"
                style={{
                  borderColor: color.border.default,
                  backgroundColor: color.background.card,
                }}
              >
                <Text
                  className="text-[16px] font-medium leading-[21px]"
                  style={{ color: color.text.primary }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {preview ? (
                  <Text
                    className="mt-2 text-[14px] leading-5"
                    style={{ color: color.text.secondary }}
                    numberOfLines={2}
                  >
                    {preview}
                  </Text>
                ) : null}
                <Text
                  className="mt-2 text-[13px] leading-[18px]"
                  style={{ color: color.text.muted }}
                >
                  {t('trash.purgeOn', { date: formatPurgeDate(item.purgeAt) })}
                </Text>
                <View style={{ marginTop: 12, gap: 6 }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onRestore(item)}
                    style={{
                      height: TRASH_RESTORE_BTN_H,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: color.border.default,
                      backgroundColor: color.background.secondary,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      className="text-[15px] font-semibold"
                      style={{
                        color: color.text.primary,
                        ...(IS_ANDROID ? { includeFontPadding: false } : {}),
                      }}
                    >
                      {t('trash.restore')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onDeleteForever(item)}
                    style={{
                      paddingVertical: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      className="text-[15px] font-semibold"
                      style={{
                        color: color.accent.delete,
                        ...(IS_ANDROID ? { includeFontPadding: false } : {}),
                      }}
                    >
                      {t('trash.deleteForever')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>
      <BlockingProgressModal
        visible={isEmptyingTrash}
        title={t('trash.emptyTrashLoadingTitle')}
        description={t('trash.emptyTrashLoadingDescription')}
        total={emptyTrashProgress.total}
        progressLabel={
          emptyTrashProgress.total > 0
            ? t('storage.deleteAllProgressCounter', {
                current: emptyTrashProgress.current,
                total: emptyTrashProgress.total,
              })
            : undefined
        }
      />
    </View>
  );
};
