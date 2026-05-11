import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
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
import { useColors } from '@/shared/config';
import { hapticSelection, IS_ANDROID } from '@/shared/lib';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { SCREEN_PADDING, ScreenHeader } from '@/shared/ui';

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

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const list = await recordRepository.getTrashedList();
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

  const maxW = contentMaxWidth ?? windowWidth;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('trash.title')} onBack={() => navigation.goBack()} />
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
          ListHeaderComponent={
            <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
              {t('trash.intro')}
            </Text>
          }
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-16">
                <ActivityIndicator color={color.accent.primary} />
              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-16">
                <Text className="text-center text-[16px]" style={{ color: color.text.muted }}>
                  {t('trash.empty')}
                </Text>
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
    </View>
  );
};
