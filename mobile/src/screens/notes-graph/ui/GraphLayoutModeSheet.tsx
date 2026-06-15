import { CircleDashed, LayoutGrid, Waypoints } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Colors, useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  type SheetEnumOptionIconTone,
  SheetEnumOptionList,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { getGraphLayoutModeSheetBottomPadding } from '../lib/graphLayoutModeSheetLayout';
import { GRAPH_LAYOUT_MODES, type GraphLayoutMode } from '../lib/graphTypes';

type GraphLayoutModeSheetProps = {
  visible: boolean;
  selectedMode: GraphLayoutMode;
  onSelect: (mode: GraphLayoutMode) => void;
  onClose: () => void;
};

function getLayoutModeIconAccent(mode: GraphLayoutMode, color: Colors): string {
  switch (mode) {
    case 'cluster':
      return color.accent.primary;
    case 'force':
      return color.accent.transcript;
    case 'circular':
      return color.accent.cache;
  }
}

function LayoutModeIcon({ mode, accentHex }: { mode: GraphLayoutMode; accentHex: string }) {
  const iconProps = {
    size: 18,
    color: accentHex,
    strokeWidth: 2,
  } as const;

  switch (mode) {
    case 'cluster':
      return <LayoutGrid {...iconProps} />;
    case 'force':
      return <Waypoints {...iconProps} />;
    case 'circular':
      return <CircleDashed {...iconProps} />;
  }
}

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
          icon: <LayoutModeIcon mode={mode} accentHex={accentHex} />,
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
