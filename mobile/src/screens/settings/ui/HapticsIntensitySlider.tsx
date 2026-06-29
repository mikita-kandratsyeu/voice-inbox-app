import React, { useCallback, useMemo } from 'react';

import type { HapticsIntensity } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { previewHapticsIntensity } from '@/shared/lib/haptics/previewIntensity';
import { DEFAULT_HAPTICS_INTENSITY } from '@/shared/lib/haptics/types';

import { DiscreteChoiceSlider } from './DiscreteChoiceSlider';

const HAPTICS_INTENSITY_CHOICES: readonly HapticsIntensity[] = ['off', 'subtle', 'full'];
const HAPTICS_INTENSITY_INDICES = HAPTICS_INTENSITY_CHOICES.map((_, index) => index);
const EXPRESSIVE_PREVIEW_INDEX = HAPTICS_INTENSITY_CHOICES.indexOf('full');

type HapticsIntensitySliderProps = {
  value: HapticsIntensity;
  onChange: (value: HapticsIntensity) => void;
  tickLabel: (value: HapticsIntensity) => string;
  sliderAccessibilityLabel: string;
  color: Colors;
  embedded?: boolean;
};

export function HapticsIntensitySlider({
  value,
  onChange,
  tickLabel,
  sliderAccessibilityLabel,
  color,
  embedded = false,
}: HapticsIntensitySliderProps) {
  const valueIndex = useMemo(() => {
    const index = HAPTICS_INTENSITY_CHOICES.indexOf(value);
    return index >= 0 ? index : HAPTICS_INTENSITY_CHOICES.indexOf(DEFAULT_HAPTICS_INTENSITY);
  }, [value]);

  const intensityAtIndex = useCallback(
    (index: number): HapticsIntensity =>
      HAPTICS_INTENSITY_CHOICES[index] ?? DEFAULT_HAPTICS_INTENSITY,
    [],
  );

  const previewAtIndex = useCallback(
    (index: number) => {
      previewHapticsIntensity(intensityAtIndex(index));
    },
    [intensityAtIndex],
  );

  return (
    <DiscreteChoiceSlider
      choices={HAPTICS_INTENSITY_INDICES}
      value={valueIndex}
      onChange={(index) => onChange(intensityAtIndex(index))}
      tickLabel={(index) => tickLabel(intensityAtIndex(index))}
      sliderAccessibilityLabel={sliderAccessibilityLabel}
      color={color}
      embedded={embedded}
      previewHapticAtIndex={previewAtIndex}
      richRealtimeAtIndex={EXPRESSIVE_PREVIEW_INDEX}
    />
  );
}
