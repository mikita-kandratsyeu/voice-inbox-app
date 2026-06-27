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
  tickLabel: (sec: CloudAiKvTtlSeconds) => string;
  sliderAccessibilityLabel: string;
  color: Colors;
};

export function CloudAiKvTtlSlider({
  valueSeconds,
  onChangeSeconds,
  tickLabel,
  sliderAccessibilityLabel,
  color,
}: CloudAiKvTtlSliderProps) {
  return (
    <DiscreteChoiceSlider
      choices={CLOUD_AI_KV_TTL_CHOICES}
      value={valueSeconds}
      onChange={onChangeSeconds}
      tickLabel={(sec) => tickLabel(sec as CloudAiKvTtlSeconds)}
      sliderAccessibilityLabel={sliderAccessibilityLabel}
      color={color}
    />
  );
}
