import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { BatchCheckbox } from '@/features/batch-select';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { formatFileSize } from '@/shared/lib/whisper';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

export type DeleteStorageCategoryId = 'library' | 'whisper' | 'localLlm' | 'cache';

export type DeleteStorageSelection = Record<DeleteStorageCategoryId, boolean>;

export type DeleteStorageCategoryBytes = Record<DeleteStorageCategoryId, number>;

const CATEGORY_ORDER: DeleteStorageCategoryId[] = ['library', 'whisper', 'localLlm', 'cache'];

function defaultSelection(bytes: DeleteStorageCategoryBytes): DeleteStorageSelection {
  return {
    library: bytes.library > 0,
    whisper: bytes.whisper > 0,
    localLlm: bytes.localLlm > 0,
    cache: bytes.cache > 0,
  };
}

type RowDef = {
  id: DeleteStorageCategoryId;
  titleKey: string;
  subtitleKey: string;
};

const ROWS: RowDef[] = [
  {
    id: 'library',
    titleKey: 'storage.deleteCategoryLibrary',
    subtitleKey: 'storage.deleteCategoryLibrarySubtitle',
  },
  {
    id: 'whisper',
    titleKey: 'storage.deleteCategoryWhisper',
    subtitleKey: 'storage.deleteCategoryWhisperSubtitle',
  },
  {
    id: 'localLlm',
    titleKey: 'storage.deleteCategoryLocalLlm',
    subtitleKey: 'storage.deleteCategoryLocalLlmSubtitle',
  },
  {
    id: 'cache',
    titleKey: 'storage.deleteCategoryCache',
    subtitleKey: 'storage.deleteCategoryCacheSubtitle',
  },
];

type DeleteStorageDataSheetProps = {
  visible: boolean;
  onClose: () => void;
  categoryBytes: DeleteStorageCategoryBytes;
  onConfirm: (selection: DeleteStorageSelection) => void;
};

export function DeleteStorageDataSheet({
  visible,
  onClose,
  categoryBytes,
  onConfirm,
}: DeleteStorageDataSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const [selection, setSelection] = useState<DeleteStorageSelection>(() =>
    defaultSelection(categoryBytes),
  );

  useEffect(() => {
    if (!visible) return;
    setSelection(defaultSelection(categoryBytes));
  }, [
    visible,
    categoryBytes.library,
    categoryBytes.whisper,
    categoryBytes.localLlm,
    categoryBytes.cache,
    categoryBytes,
  ]);

  const selectedBytes = useMemo(
    () => CATEGORY_ORDER.reduce((sum, id) => (selection[id] ? sum + categoryBytes[id] : sum), 0),
    [selection, categoryBytes],
  );

  const canSubmit = selectedBytes > 0;

  const visibleRows = useMemo(
    () => ROWS.filter((row) => categoryBytes[row.id] > 0),
    [categoryBytes],
  );

  const toggle = useCallback((id: DeleteStorageCategoryId) => {
    hapticSelection();
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handlePrimaryPress = useCallback(() => {
    if (!canSubmit) return;
    hapticSelection();
    onConfirm(selection);
  }, [canSubmit, onConfirm, selection]);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent>
        <SheetHeader
          title={t('storage.deleteChooserTitle')}
          subtitle={t('storage.deleteChooserHint')}
          color={color}
          marginBottom={16}
        />

        {visibleRows.length > 0 ? (
          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
            }}
          >
            {visibleRows.map((row, index) => {
              const bytes = categoryBytes[row.id];
              const checked = selection[row.id];
              return (
                <TouchableOpacity
                  key={row.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${t(row.titleKey)}, ${formatFileSize(bytes)}`}
                  onPress={() => toggle(row.id)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: index < visibleRows.length - 1 ? 1 : 0,
                    borderBottomColor: color.border.default,
                  }}
                >
                  <BatchCheckbox isSelected={checked} color={color} size={22} />
                  <View className="min-w-0 flex-1 pl-3">
                    <View className="flex-row items-baseline justify-between gap-2">
                      <Text
                        className="flex-1 text-[16px] leading-[21px]"
                        style={{ color: color.text.primary }}
                      >
                        {t(row.titleKey)}
                      </Text>
                      <Text
                        className="text-[14px] leading-5"
                        style={{ color: color.text.muted, fontVariant: ['tabular-nums'] }}
                      >
                        {formatFileSize(bytes)}
                      </Text>
                    </View>
                    <Text
                      className="mt-0.5 text-[13px] leading-[18px]"
                      style={{ color: color.text.muted }}
                    >
                      {t(row.subtitleKey)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text
            className="mb-1 px-1 text-center text-[14px] leading-5"
            style={{ color: color.text.secondary }}
          >
            {t('storage.deleteChooserAllEmpty')}
          </Text>
        )}

        <SheetFooterButtons
          className="mt-4 w-full"
          color={color}
          primaryLabel={
            canSubmit ? t('storage.deleteChooserAction') : t('storage.deleteChooserNothing')
          }
          labelSuffix={canSubmit ? formatFileSize(selectedBytes) : undefined}
          onPrimaryPress={handlePrimaryPress}
          primaryDisabled={!canSubmit}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
