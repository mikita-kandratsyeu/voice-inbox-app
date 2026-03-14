import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Check, Square } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { getColors, useAppTheme } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { Button, ScreenHeader } from '@/shared/ui';

type ImportRecordsRouteProp = RouteProp<SettingsStackParamList, 'ImportRecords'>;

type ImportRecordRowProps = {
  item: VoiceRecord;
  isSelected: boolean;
  onToggle: (id: string) => void;
  color: ReturnType<typeof getColors>;
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
    <Pressable
      onPress={() => onToggle(item.id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: color.background.card,
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          marginRight: 12,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 1,
            width: 22,
            height: 22,
            borderRadius: 4,
            backgroundColor: color.accent.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSelected ? 1 : 0,
          }}
          pointerEvents="none"
        >
          <Check size={14} color="#ffffff" strokeWidth={2.5} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 1,
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSelected ? 0 : 1,
          }}
          pointerEvents="none"
        >
          <Square size={20} color={color.icon.muted} strokeWidth={2} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: color.text.primary }} numberOfLines={1}>
          {item.title || t('record.autoTitle.morning')}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: color.text.secondary }}>
          {formatRelativeTime(item.createdAt, language)} · {item.duration}
        </Text>
      </View>
    </Pressable>
  );
});

export const ImportRecordsScreen = () => {
  const { t, i18n } = useTranslation();
  const color = getColors(useAppTheme());
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
    try {
      for (const record of toImport) {
        await addRecord(record);
      }
      navigation.goBack();
      Alert.alert(t('common.done'), t('importExport.importSuccess', { count: toImport.length }));
    } catch {
      Alert.alert(t('common.error'), t('importExport.importRecordError'));
    } finally {
      setIsImporting(false);
    }
  }, [addRecord, importable, navigation, selectedCount, selectedIds, t]);

  const renderImportableItem = useCallback(
    ({ item }: { item: VoiceRecord }) => (
      <ImportRecordRow
        item={item}
        isSelected={selectedIds.has(item.id)}
        onToggle={toggleRecord}
        color={color}
        t={t}
        language={i18n.language}
      />
    ),
    [color, selectedIds, toggleRecord, t, i18n.language],
  );

  const renderDuplicateItem = useCallback(
    ({ item }: { item: VoiceRecord }) => (
      <View
        className="flex-row items-center px-4 py-3.5"
        style={{
          backgroundColor: color.background.card,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
          opacity: 0.6,
        }}
      >
        <View className="mr-3">
          <Square size={24} color={color.icon.muted} strokeWidth={1.5} />
        </View>
        <View className="flex-1">
          <Text className="text-[16px]" style={{ color: color.text.primary }} numberOfLines={1}>
            {item.title || t('record.autoTitle.morning')}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: color.text.secondary }}>
            {formatRelativeTime(item.createdAt, i18n.language)} · {t('importExport.alreadyInApp')}
          </Text>
        </View>
      </View>
    ),
    [color, t, i18n.language],
  );

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

      <View className="px-4 py-3" style={{ backgroundColor: color.background.primary }}>
        <Text className="text-sm" style={{ color: color.text.secondary }}>
          {t('importExport.importSelectSubtitle', {
            importable: importable.length,
            duplicates: duplicates.length,
          })}
        </Text>
        {importable.length > 0 && (
          <View
            className="mt-3 flex-row items-center"
            style={{
              gap: 16,
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: color.background.tertiary,
              borderRadius: 12,
            }}
          >
            <TouchableOpacity
              onPress={selectAll}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              activeOpacity={0.7}
              style={{ paddingVertical: 8, paddingRight: 16, marginRight: 16 }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: color.accent.primary,
                }}
              >
                {t('importExport.selectAll')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deselectAll}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              activeOpacity={0.7}
              style={{ paddingVertical: 8 }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: color.accent.primary,
                }}
              >
                {t('importExport.deselectAll')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {importable.length > 0 ? (
        <FlatList
          data={importable}
          keyExtractor={(item) => item.id}
          renderItem={renderImportableItem}
          ListFooterComponent={
            duplicates.length > 0 ? (
              <>
                <View className="px-4 py-2" style={{ backgroundColor: color.background.secondary }}>
                  <Text
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: color.text.secondary }}
                  >
                    {t('importExport.alreadyInAppSection')}
                  </Text>
                </View>
                {duplicates.map((item) => (
                  <View key={item.id}>{renderDuplicateItem({ item })}</View>
                ))}
              </>
            ) : null
          }
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
          }}
        />
      ) : null}

      {importable.length === 0 && duplicates.length > 0 && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base" style={{ color: color.text.secondary }}>
            {t('importExport.allAlreadyInApp')}
          </Text>
        </View>
      )}

      {importable.length === 0 && duplicates.length === 0 && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base" style={{ color: color.text.secondary }}>
            {t('importExport.noRecordsInFile')}
          </Text>
        </View>
      )}
    </View>
  );
};
