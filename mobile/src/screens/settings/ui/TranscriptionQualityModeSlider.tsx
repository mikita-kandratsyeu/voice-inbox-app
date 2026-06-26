import React, { useCallback, useMemo } from 'react';

import type { TranscriptionQualityMode } from '@/entities/settings';
import { TRANSCRIPTION_QUALITY_MODES } from '@/features/transcription/lib/transcriptionQualityMode';
import type { Colors } from '@/shared/config';

import { DiscreteChoiceSlider } from './DiscreteChoiceSlider';

const QUALITY_MODE_CHOICE_INDICES = TRANSCRIPTION_QUALITY_MODES.map((_, index) => index);

type TranscriptionQualityModeSliderProps = {
  value: TranscriptionQualityMode;
  onChange: (mode: TranscriptionQualityMode) => void;
  fullLabel: (mode: TranscriptionQualityMode) => string;
  tickLabel: (mode: TranscriptionQualityMode) => string;
  sliderAccessibilityLabel: string;
  color: Colors;
  embedded?: boolean;
};

export function TranscriptionQualityModeSlider({
  value,
  onChange,
  fullLabel,
  tickLabel,
  sliderAccessibilityLabel,
  color,
  embedded = false,
}: TranscriptionQualityModeSliderProps) {
  const valueIndex = useMemo(() => {
    const index = TRANSCRIPTION_QUALITY_MODES.indexOf(value);
    return index >= 0 ? index : 1;
  }, [value]);

  const modeAtIndex = useCallback(
    (index: number): TranscriptionQualityMode => TRANSCRIPTION_QUALITY_MODES[index] ?? 'balanced',
    [],
  );

  return (
    <DiscreteChoiceSlider
      choices={QUALITY_MODE_CHOICE_INDICES}
      value={valueIndex}
      onChange={(index) => onChange(modeAtIndex(index))}
      fullLabel={(index) => fullLabel(modeAtIndex(index))}
      tickLabel={(index) => tickLabel(modeAtIndex(index))}
      sliderAccessibilityLabel={sliderAccessibilityLabel}
      color={color}
      embedded={embedded}
    />
  );
}
