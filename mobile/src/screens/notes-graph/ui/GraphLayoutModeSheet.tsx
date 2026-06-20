import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  type SheetEnumOptionIconTone,
  SheetEnumOptionList,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { getLayoutModeIconAccent } from '../lib/graphLayoutModeAccent';
import { getGraphLayoutModeSheetBottomPadding } from '../lib/graphLayoutModeSheetLayout';
import { GRAPH_LAYOUT_MODES, type GraphLayoutMode } from '../lib/graphTypes';
import { GraphLayoutModeIcon } from './GraphLayoutModeIcon';

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
  const options = useMemo(
    () =>
      GRAPH_LAYOUT_MODES.map((mode) => {
        const accentHex = getLayoutModeIconAccent(mode, color);
        const iconTone: SheetEnumOptionIconTone = { accentHex };
        return {
          value: mode,
          label: t(`notesGraph.filters.layoutMode.${mode}`),
          hint: t(`notesGraph.filters.layoutModeHint.${mode}`),
          iconTone,
          icon: <GraphLayoutModeIcon mode={mode} accentHex={accentHex} />,
        };
      }),
    [color, t],
  );

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      enableDynamicSizing
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
