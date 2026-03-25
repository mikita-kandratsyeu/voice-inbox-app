import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { formatRelativeTime, useTabletContentMaxWidth } from '@/shared/lib';
import { Button, ScreenHeader, SectionHeader } from '@/shared/ui';

type ImportRecordsRouteProp = RouteProp<SettingsStackParamList, 'ImportRecords'>;

type ImportRecordRowProps = {
  item: VoiceRecord;
  isSelected: boolean;
  onToggle: (id: string) => void;
  color: Colors;
  t: (key: string) => string;
  language: string;
};

const ImportRecordRow = React.memo(function ImportRecordRow({
  item,
  isSelected,
  onToggle,
  color,
  t,
  language,
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
          {formatRelativeTime(item.createdAt, language)} · {item.duration}
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

  const existingIds = useMemo(() => new Set(existingRecords.map((r) => r.id)), [existingRecords]);

  const { importable, duplicates } = useMemo(() => {
    const imp: VoiceRecord[] = [];
    const dup: VoiceRecord[] = [];
    for (const r of fileRecords) {
      if (existingIds.has(r.id)) {
        dup.push(r);
      } else {
        imp.push(r);
      }
    }
    return { importable: imp, duplicates: dup };
  }, [fileRecords, existingIds]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(importable.map((r) => r.id)),
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(importable.map((r) => r.id)));
  }, [importable]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

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

  const handleImport = useCallback(async () => {
    if (selectedCount === 0) return;

    const toImport = importable.filter((r) => selectedIds.has(r.id));
    setIsImporting(true);
    setImportProgress({ current: 0, total: toImport.length });
    try {
      for (let i = 0; i < toImport.length; i += 1) {
        const record = toImport[i];
        await addRecord(record);
        setImportProgress({ current: i + 1, total: toImport.length });
      }
      navigation.goBack();
      Alert.alert(t('common.done'), t('importExport.importSuccess', { count: toImport.length }));
    } catch {
      Alert.alert(t('common.error'), t('importExport.importRecordError'));
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  }, [addRecord, importable, navigation, selectedCount, selectedIds, t]);

  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('importExport.importSelectTitle')}
        onBack={() => navigation.goBack()}
        rightSlot={
          importable.length > 0 ? (
            <Button
              iconOnly
              variant="icon"
              size="md"
              icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
              color={color}
              onPress={handleImport}
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
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {importable.length > 0 && (
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
                      backgroundColor:
                        selectedCount === importable.length ? color.accent.primary : 'transparent',
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color:
                          selectedCount === importable.length
                            ? color.icon.onAccent
                            : color.accent.primary,
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
                  duplicates: duplicates.length,
                })}
              </Text>
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
          {duplicates.length > 0 && (
            <>
              <SectionHeader
                title={t('importExport.alreadyInAppSection')}
                isFirst={importable.length === 0}
              />
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
                {duplicates.map((item, index) => (
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
                      ...(index < duplicates.length - 1
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
            </>
          )}
          {importable.length === 0 && duplicates.length === 0 && (
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
      <Modal visible={isImporting} transparent animationType="fade" statusBarTranslucent>
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <View
            className="w-full max-w-sm rounded-2xl px-6 py-8"
            style={{ backgroundColor: color.background.card }}
          >
            <View className="items-center justify-center">
              <ActivityIndicator size="large" color={color.accent.primary} />
            </View>
            <Text
              className="mt-5 text-center text-[16px] font-semibold leading-6"
              style={{ color: color.text.primary }}
            >
              {t('importExport.importingTitle')}
            </Text>
            <Text
              className="mt-2 text-center text-[14px] leading-5"
              style={{ color: color.text.secondary }}
            >
              {t('importExport.importingDescription')}
            </Text>
            {importProgress.total > 0 ? (
              <Text
                className="mt-3 text-center text-[13px] font-medium leading-5"
                style={{ color: color.accent.primary }}
              >
                {t('importExport.importingProgressCounter', {
                  current: importProgress.current,
                  total: importProgress.total,
                })}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};
