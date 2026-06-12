import React from 'react';

import {
  CLOUD_AI_KV_TTL_CHOICES,
  type CloudAiKvTtlSeconds,
} from '@/entities/settings/lib/cloudAiKvTtl';
import type { Colors } from '@/shared/config';

import { DiscreteChoiceSlider } from './DiscreteChoiceSlider';

type CloudAiKvTtlSliderProps = {
  valueSeconds: number;
  onChangeSeconds: (seconds: number) => void;
  fullLabel: (sec: CloudAiKvTtlSeconds) => string;
  tickLabel: (sec: CloudAiKvTtlSeconds) => string;
  sliderAccessibilityLabel: string;
  color: Colors;
};

export function CloudAiKvTtlSlider({
  valueSeconds,
  onChangeSeconds,
  fullLabel,
  tickLabel,
  sliderAccessibilityLabel,
  color,
}: CloudAiKvTtlSliderProps) {
  return (
    <DiscreteChoiceSlider
      choices={CLOUD_AI_KV_TTL_CHOICES}
      value={valueSeconds}
      onChange={onChangeSeconds}
      fullLabel={(sec) => fullLabel(sec as CloudAiKvTtlSeconds)}
      tickLabel={(sec) => tickLabel(sec as CloudAiKvTtlSeconds)}
      sliderAccessibilityLabel={sliderAccessibilityLabel}
      color={color}
    />
  );
}
