import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetEnumOptionList,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import {
  getGraphLayoutModeSheetBottomPadding,
  getGraphLayoutModeSheetSnapHeight,
} from '../lib/graphLayoutModeSheetLayout';
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
  const insets = useSafeAreaInsets();
  const subtitle = t('notesGraph.filters.layoutModePickerSubtitle');
  const bottomPadding = useMemo(
    () => getGraphLayoutModeSheetBottomPadding(insets.bottom),
    [insets.bottom],
  );
  const snapPoints = useMemo(
    () => [getGraphLayoutModeSheetSnapHeight(insets.bottom)],
    [insets.bottom],
  );
  const options = useMemo(
    () =>
      GRAPH_LAYOUT_MODES.map((mode) => ({
        value: mode,
        label: t(`notesGraph.filters.layoutMode.${mode}`),
        hint: t(`notesGraph.filters.layoutModeHint.${mode}`),
      })),
    [t],
  );

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      snapPoints={snapPoints}
      enableContentPanningGesture={false}
    >
      <AppBottomSheetContent style={{ flexGrow: 0, paddingBottom: bottomPadding }}>
        <SheetHeader
          title={t('notesGraph.filters.layoutModePickerTitle')}
          subtitle={subtitle}
          color={color}
          marginBottom={10}
        />
        <SheetEnumOptionList
          options={options}
          selected={selectedMode}
          onSelect={onSelect}
          color={color}
          borderRadius={12}
        />
        <SheetFooterButtons
          className="mt-3 w-full"
          color={color}
          primaryLabel={t('common.cancel')}
          onPrimaryPress={onClose}
          singleVariant="secondary"
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
