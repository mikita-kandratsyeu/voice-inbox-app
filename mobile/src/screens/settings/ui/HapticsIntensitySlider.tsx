import React, { useCallback, useMemo } from 'react';

import type { HapticsIntensity } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { DiscreteChoiceSlider } from './DiscreteChoiceSlider';

const HAPTICS_INTENSITY_CHOICES: readonly HapticsIntensity[] = ['off', 'subtle', 'full'];
const HAPTICS_INTENSITY_INDICES = HAPTICS_INTENSITY_CHOICES.map((_, index) => index);

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
    return index >= 0 ? index : HAPTICS_INTENSITY_CHOICES.length - 1;
  }, [value]);

  const intensityAtIndex = useCallback(
    (index: number): HapticsIntensity => HAPTICS_INTENSITY_CHOICES[index] ?? 'full',
    [],
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
      previewHaptics
    />
  );
}
