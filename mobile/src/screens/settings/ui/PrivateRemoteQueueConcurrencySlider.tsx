import React from 'react';

import {
  PRIVATE_REMOTE_QUEUE_CONCURRENCY_OPTIONS,
  type PrivateRemoteQueueConcurrency,
} from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { DiscreteChoiceSlider } from './DiscreteChoiceSlider';

type PrivateRemoteQueueConcurrencySliderProps = {
  value: PrivateRemoteQueueConcurrency;
  onChange: (value: PrivateRemoteQueueConcurrency) => void;
  tickLabel: (value: PrivateRemoteQueueConcurrency) => string;
  sliderAccessibilityLabel: string;
  color: Colors;
};

export function PrivateRemoteQueueConcurrencySlider({
  value,
  onChange,
  tickLabel,
  sliderAccessibilityLabel,
  color,
}: PrivateRemoteQueueConcurrencySliderProps) {
  return (
    <DiscreteChoiceSlider
      choices={PRIVATE_REMOTE_QUEUE_CONCURRENCY_OPTIONS}
      value={value}
      onChange={(next) => onChange(next as PrivateRemoteQueueConcurrency)}
      tickLabel={(next) => tickLabel(next as PrivateRemoteQueueConcurrency)}
      sliderAccessibilityLabel={sliderAccessibilityLabel}
      color={color}
    />
  );
}
