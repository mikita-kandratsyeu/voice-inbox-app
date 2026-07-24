import React from 'react';

import { useColors } from '@/shared/config';

import { AppBottomSheetContent } from './AppBottomSheetContent';
import { AppBottomSheetModal } from './AppBottomSheetModal';
import { type SheetEnumOption, SheetEnumOptionList } from './SheetEnumOptionList';
import { SheetFooterButtons } from './SheetFooterButtons';
import { SheetHeader } from './SheetHeader';

type SheetEnumPickerSheetProps<T extends string | number> = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SheetEnumOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  footerLabel: string;
  /** @default 'secondary' */
  footerVariant?: 'primary' | 'secondary';
  borderRadius?: number;
  getKey?: (value: T) => string;
};

export function SheetEnumPickerSheet<T extends string | number>({
  visible,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onClose,
  footerLabel,
  footerVariant = 'secondary',
  borderRadius,
  getKey,
}: SheetEnumPickerSheetProps<T>) {
  const color = useColors();

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent useTabletPadding>
        <SheetHeader title={title} subtitle={subtitle} color={color} marginBottom={16} />
        <SheetEnumOptionList
          options={options}
          selected={selected}
          onSelect={onSelect}
          color={color}
          borderRadius={borderRadius}
          getKey={getKey}
        />
        <SheetFooterButtons
          className="mt-3 w-full"
          color={color}
          primaryLabel={footerLabel}
          onPrimaryPress={onClose}
          singleVariant={footerVariant}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
