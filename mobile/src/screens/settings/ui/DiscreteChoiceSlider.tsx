import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight, IS_IOS, selectPlatform, withAlphaHex } from '@/shared/lib';

const TICK_ROW_H = 20;
const SLIDER_ROW_H = 44;
const RAIL_H = 7;
const DOT_INACTIVE = 6;
const DOT_ACTIVE = 9;

function indexForValue(choices: readonly number[], value: number): number {
  let best = 0;
  let bestDist = Infinity;
  choices.forEach((choice, i) => {
    const d = Math.abs(choice - value);
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
function sliderThumbGeometry(
  trackWidth: number,
  maxIndex: number,
): { inset: number; span: number } {
  if (trackWidth <= 0 || maxIndex <= 0) return { inset: 0, span: 0 };
  const inset = selectPlatform({
    ios: Math.min(16, trackWidth * 0.078),
    android: Math.min(12, trackWidth * 0.056),
    default: 14,
  });
  const span = Math.max(0, trackWidth - 2 * inset);
  return { inset, span };
}

function thumbCenterX(trackWidth: number, index: number, maxIndex: number): number {
  const { inset, span } = sliderThumbGeometry(trackWidth, maxIndex);
  return inset + (span * index) / maxIndex;
}

export type DiscreteChoiceSliderProps = {
  choices: readonly number[];
  value: number;
  onChange: (value: number) => void;
  fullLabel: (value: number) => string;
  tickLabel: (value: number) => string;
  sliderAccessibilityLabel: string;
  color: Colors;
};

export function DiscreteChoiceSlider({
  choices,
  value,
  onChange,
  fullLabel,
  tickLabel,
  sliderAccessibilityLabel,
  color,
}: DiscreteChoiceSliderProps) {
  const maxIndex = choices.length - 1;
  const [trackWidth, setTrackWidth] = useState(0);
  const lastHapticIndexRef = useRef(indexForValue(choices, value));

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const index = useMemo(() => indexForValue(choices, value), [choices, value]);
  const selected = choices[index]!;

  useEffect(() => {
    lastHapticIndexRef.current = index;
  }, [index]);

  const { inset, span } = useMemo(
    () => sliderThumbGeometry(trackWidth, maxIndex),
    [trackWidth, maxIndex],
  );
  const labelSlot = span > 0 && maxIndex > 0 ? span / maxIndex : 0;
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
            choices.map((choice, i) => {
              const active = i === index;
              const cx = thumbCenterX(trackWidth, i, maxIndex);
              const d = active ? DOT_ACTIVE : DOT_INACTIVE;
              return (
                <View
                  key={choice}
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
                    ...(active && IS_IOS
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
            maximumValue={maxIndex}
            step={1}
            value={index}
            onValueChange={(raw) => {
              const i = Math.round(raw);
              const clamped = Math.max(0, Math.min(maxIndex, i));
              if (clamped !== lastHapticIndexRef.current) {
                lastHapticIndexRef.current = clamped;
                hapticLight();
              }
              const next = choices[clamped];
              if (next !== undefined) onChange(next);
            }}
            minimumTrackTintColor={color.accent.primary}
            maximumTrackTintColor={color.background.tertiary}
            thumbTintColor={color.icon.onAccent}
            style={{ width: '100%', height: SLIDER_ROW_H }}
          />
        </View>

        <View style={{ height: 24, position: 'relative', marginTop: 4 }}>
          {trackWidth > 0 &&
            choices.map((choice, i) => {
              const active = i === index;
              const cx = thumbCenterX(trackWidth, i, maxIndex);
              return (
                <View
                  key={choice}
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
                    {tickLabel(choice)}
                  </Text>
                </View>
              );
            })}
        </View>
      </View>
    </View>
  );
}
