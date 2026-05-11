import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';

import {
  CLOUD_AI_KV_TTL_CHOICES,
  type CloudAiKvTtlSeconds,
} from '@/entities/settings/lib/cloudAiKvTtl';
import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

const SLIDER_MAX_INDEX = CLOUD_AI_KV_TTL_CHOICES.length - 1;
const NOTCH_ACTIVE_H = 12;
const NOTCH_INACTIVE_H = 7;
const RULER_HEIGHT = 18;

function indexForSeconds(seconds: number): number {
  let best = 0;
  let bestDist = Infinity;
  CLOUD_AI_KV_TTL_CHOICES.forEach((s, i) => {
    const d = Math.abs(s - seconds);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/**
 * Horizontal range where the native Slider thumb centers actually move.
 * @react-native-community/slider draws the track inset from the control bounds; values are tuned for alignment with tick marks.
 */
function sliderThumbGeometry(trackWidth: number): { inset: number; span: number } {
  if (trackWidth <= 0) return { inset: 0, span: 0 };
  const inset = Platform.select({
    ios: Math.min(16, trackWidth * 0.078),
    android: Math.min(12, trackWidth * 0.056),
    default: 14,
  });
  const span = Math.max(0, trackWidth - 2 * inset);
  return { inset, span };
}

function thumbCenterX(trackWidth: number, index: number): number {
  const { inset, span } = sliderThumbGeometry(trackWidth);
  return inset + (span * index) / SLIDER_MAX_INDEX;
}

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
  const [trackWidth, setTrackWidth] = useState(0);
  const lastHapticIndexRef = useRef(indexForSeconds(valueSeconds));

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const index = useMemo(() => indexForSeconds(valueSeconds), [valueSeconds]);
  const selected = CLOUD_AI_KV_TTL_CHOICES[index]!;

  useEffect(() => {
    lastHapticIndexRef.current = index;
  }, [index]);

  const { span } = sliderThumbGeometry(trackWidth);
  const labelSlot = span > 0 ? span / SLIDER_MAX_INDEX : 0;
  const labelWidth = Math.min(56, Math.max(34, labelSlot * 0.92));

  return (
    <View className="px-1 pb-3 pt-2">
      <Text
        className="mb-3 text-center text-[16px] font-semibold"
        style={{ color: color.text.primary }}
        accessibilityRole="text"
      >
        {fullLabel(selected)}
      </Text>

      <View onLayout={onTrackLayout}>
        <View style={{ height: RULER_HEIGHT + 4, position: 'relative', marginBottom: 2 }}>
          {trackWidth > 0 &&
            CLOUD_AI_KV_TTL_CHOICES.map((s, i) => {
              const active = i === index;
              const cx = thumbCenterX(trackWidth, i);
              const w = active ? 3 : 2;
              return (
                <View
                  key={s}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: cx - w / 2,
                    bottom: 4,
                    width: w,
                    height: active ? NOTCH_ACTIVE_H : NOTCH_INACTIVE_H,
                    borderRadius: active ? 2 : 1,
                    backgroundColor: active ? color.accent.primary : color.border.default,
                    opacity: active ? 1 : 0.55,
                  }}
                />
              );
            })}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: StyleSheet.hairlineWidth * 2,
              borderRadius: 1,
              backgroundColor: color.border.default,
              opacity: 0.9,
            }}
          />
        </View>

        <Slider
          accessibilityLabel={sliderAccessibilityLabel}
          accessibilityRole="adjustable"
          minimumValue={0}
          maximumValue={SLIDER_MAX_INDEX}
          step={1}
          value={index}
          onValueChange={(raw) => {
            const i = Math.round(raw);
            const clamped = Math.max(0, Math.min(SLIDER_MAX_INDEX, i));
            if (clamped !== lastHapticIndexRef.current) {
              lastHapticIndexRef.current = clamped;
              hapticLight();
            }
            const next = CLOUD_AI_KV_TTL_CHOICES[clamped];
            if (next !== undefined) onChangeSeconds(next);
          }}
          minimumTrackTintColor={color.accent.primary}
          maximumTrackTintColor={color.border.default}
          thumbTintColor={color.accent.primary}
          style={{ width: '100%', height: 36 }}
        />

        <View style={{ height: 22, position: 'relative', marginTop: 2 }}>
          {trackWidth > 0 &&
            CLOUD_AI_KV_TTL_CHOICES.map((s, i) => {
              const cx = thumbCenterX(trackWidth, i);
              return (
                <View
                  key={s}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: cx - labelWidth / 2,
                    top: 0,
                    width: labelWidth,
                  }}
                >
                  <Text
                    className="text-[11px] leading-3"
                    style={{ color: color.text.muted, textAlign: 'center' }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {tickLabel(s)}
                  </Text>
                </View>
              );
            })}
        </View>
      </View>
    </View>
  );
}
