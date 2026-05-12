import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';

import {
  CLOUD_AI_KV_TTL_CHOICES,
  type CloudAiKvTtlSeconds,
} from '@/entities/settings/lib/cloudAiKvTtl';
import type { Colors } from '@/shared/config';
import { hapticLight, withAlphaHex } from '@/shared/lib';

const SLIDER_MAX_INDEX = CLOUD_AI_KV_TTL_CHOICES.length - 1;

const TICK_ROW_H = 20;
const SLIDER_ROW_H = 44;
const RAIL_H = 7;
const DOT_INACTIVE = 6;
const DOT_ACTIVE = 9;

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

  const { inset, span } = useMemo(() => sliderThumbGeometry(trackWidth), [trackWidth]);
  const labelSlot = span > 0 ? span / SLIDER_MAX_INDEX : 0;
  const labelWidth = Math.min(56, Math.max(34, labelSlot * 0.92));

  const cardStyle = useMemo(
    () => ({
      backgroundColor: color.background.card,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
    }),
    [color],
  );

  const railTop = (SLIDER_ROW_H - RAIL_H) / 2;
  const dotCenterY = TICK_ROW_H / 2;

  return (
    <View style={cardStyle}>
      <View className="mb-3 items-center">
        <View
          className="max-w-full px-4 py-2"
          style={{
            borderRadius: 999,
            backgroundColor: withAlphaHex(color.accent.primary, 0.14),
            borderWidth: 1,
            borderColor: withAlphaHex(color.accent.primary, 0.28),
          }}
        >
          <Text
            className="text-center text-[15px] font-semibold"
            style={{ color: color.accent.primary }}
            accessibilityRole="text"
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {fullLabel(selected)}
          </Text>
        </View>
      </View>

      <View onLayout={onTrackLayout}>
        <View style={{ height: TICK_ROW_H, position: 'relative', marginBottom: 2 }}>
          {trackWidth > 0 &&
            CLOUD_AI_KV_TTL_CHOICES.map((s, i) => {
              const active = i === index;
              const cx = thumbCenterX(trackWidth, i);
              const d = active ? DOT_ACTIVE : DOT_INACTIVE;
              return (
                <View
                  key={s}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: cx - d / 2,
                    top: dotCenterY - d / 2,
                    width: d,
                    height: d,
                    borderRadius: d / 2,
                    backgroundColor: active
                      ? color.accent.primary
                      : withAlphaHex(color.text.primary, 0.14),
                    borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                    borderColor: withAlphaHex(color.text.primary, 0.22),
                    ...(active && Platform.OS === 'ios'
                      ? {
                          shadowColor: color.accent.primary,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.45,
                          shadowRadius: 5,
                        }
                      : {}),
                  }}
                />
              );
            })}
        </View>

        <View style={{ height: SLIDER_ROW_H, position: 'relative', justifyContent: 'center' }}>
          {trackWidth > 0 && span > 0 && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: inset,
                width: span,
                height: RAIL_H,
                top: railTop,
                borderRadius: RAIL_H / 2,
                backgroundColor: color.background.tertiary,
              }}
            />
          )}
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
            maximumTrackTintColor={color.background.tertiary}
            thumbTintColor={color.icon.onAccent}
            style={{ width: '100%', height: SLIDER_ROW_H }}
          />
        </View>

        <View style={{ height: 24, position: 'relative', marginTop: 4 }}>
          {trackWidth > 0 &&
            CLOUD_AI_KV_TTL_CHOICES.map((s, i) => {
              const active = i === index;
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
                    className={`text-[11px] leading-3 ${active ? 'font-semibold' : 'font-normal'}`}
                    style={{
                      color: active ? color.accent.primary : color.text.muted,
                      textAlign: 'center',
                    }}
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
