import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import { GRAPH_LAYOUT_MODES, type GraphLayoutMode } from '../lib/graphTypes';

type GraphLayoutModeSheetProps = {
  visible: boolean;
  selectedMode: GraphLayoutMode;
  onSelect: (mode: GraphLayoutMode) => void;
  onClose: () => void;
};

export function GraphLayoutModeSheet({
  visible,
  selectedMode,
  onSelect,
  onClose,
}: GraphLayoutModeSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(12);
  const subtitle = t('notesGraph.filters.layoutModePickerSubtitle');

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView style={{ paddingHorizontal: 20, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: subtitle ? 4 : 10,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('notesGraph.filters.layoutModePickerTitle')}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Text>
        ) : null}

        <View
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.card,
          }}
        >
          {GRAPH_LAYOUT_MODES.map((mode, index) => {
            const selected = mode === selectedMode;
            return (
              <TouchableOpacity
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`notesGraph.filters.layoutMode.${mode}`)}
                onPress={() => onSelect(mode)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index < GRAPH_LAYOUT_MODES.length - 1 ? 1 : 0,
                  borderBottomColor: color.border.default,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 16, color: color.text.primary }}>
                      {t(`notesGraph.filters.layoutMode.${mode}`)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        lineHeight: 18,
                        color: color.text.muted,
                        marginTop: 4,
                      }}
                    >
                      {t(`notesGraph.filters.layoutModeHint.${mode}`)}
                    </Text>
                  </View>
                  {selected ? (
                    <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <SheetFooterButtons
          className="mt-3 w-full"
          color={color}
          primaryLabel={t('common.cancel')}
          onPrimaryPress={onClose}
          singleVariant="secondary"
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
