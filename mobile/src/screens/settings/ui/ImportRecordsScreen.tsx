import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { recordRepository } from '@/entities/record/model/repository';
import { useAdsAllowed } from '@/features/app-storefront';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { tryShowYandexInterstitial } from '@/features/yandex-interstitial';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { formatRelativeTime, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { BlockingProgressModal, Button, ScreenHeader } from '@/shared/ui';

type ImportRecordsRouteProp = RouteProp<SettingsStackParamList, 'ImportRecords'>;

const duplicateSectionTitleTextStyle = {
  fontSize: 12,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
};

type ImportRecordRowProps = {
  item: VoiceRecord;
  isSelected: boolean;
  onToggle: (id: string) => void;
  color: Colors;
  t: (key: string) => string;
  language: string;
  /** When set, shown after the bullet instead of `item.duration` (e.g. Trash replace row). */
  detailSuffix?: string;
};

const ImportRecordRow = memo(function ImportRecordRow({
  item,
  isSelected,
  onToggle,
  color,
  t,
  language,
  detailSuffix,
}: ImportRecordRowProps) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityLabel={item.title}
      accessibilityState={{ checked: isSelected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 52,
        backgroundColor: color.background.card,
      }}
    >
      <View style={{ marginRight: 12 }}>
        {isSelected ? (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: color.accent.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={14} color="#ffffff" strokeWidth={2.5} />
          </View>
        ) : (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: color.border.default,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: color.text.primary }} numberOfLines={1}>
          {item.title || t('record.autoTitle.morning')}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 13, color: color.text.secondary }}>
          {formatRelativeTime(item.createdAt, language)} · {detailSuffix ?? item.duration}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export const ImportRecordsScreen = () => {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ImportRecordsRouteProp>();
  const { records: fileRecords } = route.params;

  const existingRecords = useRecordStore((s) => s.records);
  const addRecord = useRecordStore((s) => s.addRecord);
  const purgeRecordPermanently = useRecordStore((s) => s.purgeRecordPermanently);
  const loadRecords = useRecordStore((s) => s.load);
  const { adsAllowed } = useAdsAllowed();

  const archiveRecordIdsKey = useMemo(
    () =>
      fileRecords
        .map((r) => r.id)
        .slice()
        .sort()
        .join('|'),
    [fileRecords],
  );

  const [dbRecordIds, setDbRecordIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDbRecordIds(null);
    void (async () => {
      const ids = await recordRepository.listAllRecordIds();
      if (!cancelled) setDbRecordIds(new Set(ids));
    })();
    return () => {
      cancelled = true;
    };
  }, [archiveRecordIdsKey]);

  const { importable, duplicatesActive, duplicatesTrash } = useMemo(() => {
    if (!dbRecordIds) {
      return {
        importable: [] as VoiceRecord[],
        duplicatesActive: [] as VoiceRecord[],
        duplicatesTrash: [] as VoiceRecord[],
      };
    }
    const activeIds = new Set(existingRecords.map((r) => r.id));
    const imp: VoiceRecord[] = [];
    const dupActive: VoiceRecord[] = [];
    const dupTrash: VoiceRecord[] = [];
    for (const r of fileRecords) {
      if (!dbRecordIds.has(r.id)) {
        imp.push(r);
      } else if (activeIds.has(r.id)) {
        dupActive.push(r);
      } else {
        dupTrash.push(r);
      }
    }
    return { importable: imp, duplicatesActive: dupActive, duplicatesTrash: dupTrash };
  }, [fileRecords, dbRecordIds, existingRecords]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!dbRecordIds) return;
    setSelectedIds(new Set(importable.map((r) => r.id)));
  }, [dbRecordIds, importable]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const selectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of importable) {
        next.add(r.id);
      }
      return next;
    });
  }, [importable]);

  const deselectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of importable) {
        next.delete(r.id);
      }
      return next;
    });
  }, [importable]);

  const toggleRecord = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;

  const allImportableSelected =
    importable.length > 0 && importable.every((r) => selectedIds.has(r.id));

  const trashIdsForReplace = useMemo(
    () => new Set(duplicatesTrash.map((r) => r.id)),
    [duplicatesTrash],
  );

  const performImport = useCallback(async () => {
    const fromImportable = importable.filter((r) => selectedIds.has(r.id));
    const fromTrash = duplicatesTrash.filter((r) => selectedIds.has(r.id));
    const toProcess = [...fromImportable, ...fromTrash];
    if (toProcess.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: toProcess.length });
    try {
      for (let i = 0; i < toProcess.length; i += 1) {
        const record = toProcess[i]!;
        if (trashIdsForReplace.has(record.id)) {
          await purgeRecordPermanently(record.id);
        }
        await addRecord(record);
        setImportProgress({ current: i + 1, total: toProcess.length });
      }
      await loadRecords();
      navigation.goBack();
      await tryShowYandexInterstitial({ adsAllowed, trigger: 'after_import' });
      Alert.alert(t('common.done'), t('importExport.importSuccess', { count: toProcess.length }));
    } catch {
      Alert.alert(t('common.error'), t('importExport.importRecordError'));
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  }, [
    addRecord,
    adsAllowed,
    duplicatesTrash,
    importable,
    loadRecords,
    navigation,
    purgeRecordPermanently,
    selectedIds,
    t,
    trashIdsForReplace,
  ]);

  const handleImportPress = useCallback(() => {
    if (selectedCount === 0) return;
    const trashPicked = duplicatesTrash.filter((r) => selectedIds.has(r.id));
    if (trashPicked.length > 0) {
      Alert.alert(
        t('importExport.replaceTrashTitle'),
        t('importExport.replaceTrashMessage', { count: trashPicked.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('importExport.replaceTrashConfirm'),
            onPress: () => {
              void performImport();
            },
          },
        ],
      );
      return;
    }
    void performImport();
  }, [duplicatesTrash, performImport, selectedCount, selectedIds, t]);

  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('importExport.importSelectTitle')}
        onBack={() => navigation.goBack()}
        rightSlot={
          dbRecordIds !== null && (importable.length > 0 || duplicatesTrash.length > 0) ? (
            <Button
              iconOnly
              variant="icon"
              size="md"
              icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
              color={color}
              onPress={handleImportPress}
              disabled={selectedCount === 0 || isImporting}
            />
          ) : null
        }
      />

      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {dbRecordIds === null && (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={color.accent.primary} />
              <Text style={{ marginTop: 12, fontSize: 14, color: color.text.secondary }}>
                {t('importExport.resolvingDuplicates')}
              </Text>
            </View>
          )}
          {dbRecordIds !== null && fileRecords.length > 0 && (
            <Text
              style={{
                fontSize: 13,
                color: color.text.secondary,
                textAlign: 'center',
                marginBottom: 16,
                paddingHorizontal: 4,
              }}
            >
              {t('importExport.importSelectSubtitle', {
                importable: importable.length,
                duplicates: duplicatesActive.length,
                inTrash: duplicatesTrash.length,
              })}
            </Text>
          )}
          {dbRecordIds !== null && importable.length > 0 && (
            <>
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: color.text.secondary,
                    marginBottom: 8,
                    paddingHorizontal: 4,
                  }}
                >
                  {t('importExport.selectRecords')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: color.background.tertiary,
                    borderRadius: 10,
                    padding: 4,
                  }}
                >
                  <TouchableOpacity
                    onPress={selectAll}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      backgroundColor: allImportableSelected ? color.accent.primary : 'transparent',
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: allImportableSelected ? color.icon.onAccent : color.accent.primary,
                      }}
                    >
                      {t('importExport.selectAll')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={deselectAll}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      backgroundColor: selectedCount === 0 ? color.accent.primary : 'transparent',
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: selectedCount === 0 ? color.icon.onAccent : color.text.secondary,
                      }}
                    >
                      {t('importExport.deselectAll')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View
                style={{
                  marginBottom: 24,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: color.border.default,
                  backgroundColor: color.background.card,
                }}
              >
                {importable.map((item, index) => (
                  <View
                    key={item.id}
                    style={
                      index < importable.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                        : undefined
                    }
                  >
                    <ImportRecordRow
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggle={toggleRecord}
                      color={color}
                      t={t}
                      language={i18n.language}
                    />
                  </View>
                ))}
              </View>
            </>
          )}
          {dbRecordIds !== null && duplicatesActive.length > 0 && (
            <View
              style={{
                marginTop: importable.length === 0 ? 10 : 0,
                marginBottom: 24,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: color.border.default,
                backgroundColor: color.background.card,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: color.border.default,
                  backgroundColor: color.background.card,
                }}
              >
                <Text style={{ ...duplicateSectionTitleTextStyle, color: color.text.secondary }}>
                  {t('importExport.alreadyInAppSection')}
                </Text>
              </View>
              {duplicatesActive.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    minHeight: 52,
                    backgroundColor: color.background.card,
                    opacity: 0.7,
                    ...(index < duplicatesActive.length - 1
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: color.border.default,
                        }
                      : {}),
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: color.text.primary }} numberOfLines={1}>
                      {item.title || t('record.autoTitle.morning')}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 13, color: color.text.secondary }}>
                      {formatRelativeTime(item.createdAt, i18n.language)} ·{' '}
                      {t('importExport.alreadyInApp')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {dbRecordIds !== null && duplicatesTrash.length > 0 && (
            <View
              style={{
                marginTop: importable.length === 0 && duplicatesActive.length === 0 ? 10 : 0,
                marginBottom: 24,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: color.border.default,
                backgroundColor: color.background.card,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: color.border.default,
                  backgroundColor: color.background.card,
                }}
              >
                <Text style={{ ...duplicateSectionTitleTextStyle, color: color.text.secondary }}>
                  {t('importExport.inTrashSection')}
                </Text>
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    lineHeight: 18,
                    color: color.text.secondary,
                  }}
                >
                  {t('importExport.inTrashHint')}
                </Text>
              </View>
              {duplicatesTrash.map((item, index) => (
                <View
                  key={item.id}
                  style={
                    index < duplicatesTrash.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                      : undefined
                  }
                >
                  <ImportRecordRow
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggle={toggleRecord}
                    color={color}
                    t={t}
                    language={i18n.language}
                    detailSuffix={t('importExport.inTrashReplaceBadge')}
                  />
                </View>
              ))}
            </View>
          )}
          {dbRecordIds !== null &&
            importable.length === 0 &&
            duplicatesActive.length === 0 &&
            duplicatesTrash.length === 0 && (
              <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 48 }}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 16,
                    color: color.text.secondary,
                  }}
                >
                  {t('importExport.noRecordsInFile')}
                </Text>
              </View>
            )}
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} density="compact" />
        </ScrollView>
      </View>
      <BlockingProgressModal
        visible={isImporting}
        title={t('importExport.importingTitle')}
        description={t('importExport.importingDescription')}
        total={importProgress.total}
        progressLabel={
          importProgress.total > 0
            ? t('importExport.importingProgressCounter', {
                current: importProgress.current,
                total: importProgress.total,
              })
            : undefined
        }
      />
    </View>
  );
};
