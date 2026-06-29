import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useRealtimeComposer } from 'react-native-pulsar';

import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { shouldReduceMotion } from '@/shared/config/animations';
import {
  hapticLight,
  hapticMedium,
  IS_IOS,
  selectPlatform,
  supportsRichHapticEngine,
  withAlphaHex,
} from '@/shared/lib';

const TICK_ROW_H = 20;
const SLIDER_ROW_H = 44;
const RAIL_H = 7;
const DOT_INACTIVE = 6;
const DOT_ACTIVE = 9;
const LABEL_ROW_H = 26;

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

/** Center of each equal-width choice slot — same grid used for dots, rail, and labels. */
function choiceAnchorX(trackWidth: number, index: number, choiceCount: number): number {
  return ((index + 0.5) / choiceCount) * trackWidth;
}

/**
 * Native Slider thumb insets from its bounds; symmetric margins align stops with slot centers.
 */
function sliderThumbGeometry(
  sliderWidth: number,
  maxIndex: number,
): { inset: number; span: number } {
  if (sliderWidth <= 0 || maxIndex <= 0) return { inset: 0, span: 0 };
  const inset = selectPlatform({
    ios: Math.min(16, sliderWidth * 0.078),
    android: Math.min(12, sliderWidth * 0.056),
    default: 14,
  });
  const span = Math.max(0, sliderWidth - 2 * inset);
  return { inset, span };
}

function sliderHorizontalMargin(trackWidth: number, choiceCount: number): number {
  if (trackWidth <= 0 || choiceCount <= 1) return 0;
  const maxIndex = choiceCount - 1;
  const firstAnchor = choiceAnchorX(trackWidth, 0, choiceCount);
  const { inset } = sliderThumbGeometry(trackWidth, maxIndex);
  return Math.max(0, firstAnchor - inset);
}

export type DiscreteChoiceSliderProps = {
  choices: readonly number[];
  value: number;
  onChange: (value: number) => void;
  tickLabel: (value: number) => string;
  sliderAccessibilityLabel: string;
  color: Colors;
  /** Inside SettingsSection card — skip outer card padding/background. */
  embedded?: boolean;
  /** Preview haptics for the step being selected (bypasses stored intensity). */
  previewHapticAtIndex?: (index: number) => void;
  /** Pulsar realtime drag feedback only while thumb is on this step. */
  richRealtimeAtIndex?: number;
};

export function DiscreteChoiceSlider({
  choices,
  value,
  onChange,
  tickLabel,
  sliderAccessibilityLabel,
  color,
  embedded = false,
  previewHapticAtIndex,
  richRealtimeAtIndex,
}: DiscreteChoiceSliderProps) {
  const choiceCount = choices.length;
  const maxIndex = choiceCount - 1;
  const [trackWidth, setTrackWidth] = useState(0);
  const lastHapticIndexRef = useRef(indexForValue(choices, value));
  const hapticsIntensity = useSettingsStore((s) => s.hapticsIntensity);
  const { set: setRealtimeHaptic, playDiscrete, stop: stopRealtimeHaptic } = useRealtimeComposer();

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const index = useMemo(() => indexForValue(choices, value), [choices, value]);

  useEffect(() => {
    lastHapticIndexRef.current = index;
  }, [index]);

  useEffect(() => () => stopRealtimeHaptic(), [stopRealtimeHaptic]);

  const sliderMargin = useMemo(
    () => sliderHorizontalMargin(trackWidth, choiceCount),
    [trackWidth, choiceCount],
  );

  const railLeft = useMemo(
    () => (trackWidth > 0 ? choiceAnchorX(trackWidth, 0, choiceCount) : 0),
    [trackWidth, choiceCount],
  );
  const railWidth = useMemo(
    () =>
      trackWidth > 0 && maxIndex > 0
        ? choiceAnchorX(trackWidth, maxIndex, choiceCount) - railLeft
        : 0,
    [trackWidth, choiceCount, maxIndex, railLeft],
  );

  const cardStyle = useMemo(
    () =>
      embedded
        ? {
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
            paddingTop: 0,
            paddingBottom: 0,
          }
        : {
            backgroundColor: color.background.card,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 12,
          },
    [color, embedded],
  );

  const railTop = (SLIDER_ROW_H - RAIL_H) / 2;
  const dotCenterY = TICK_ROW_H / 2;

  const fireSliderNotchHaptic = useCallback(() => {
    const rich = hapticsIntensity === 'full' && supportsRichHapticEngine();
    if (rich) {
      try {
        playDiscrete(0.75, 0.45);
      } catch {
        hapticMedium();
      }
      return;
    }
    if (hapticsIntensity !== 'off') {
      hapticLight();
    }
  }, [hapticsIntensity, playDiscrete]);

  const shouldUseRichRealtime = useCallback(
    (stepIndex: number) => {
      if (!supportsRichHapticEngine() || shouldReduceMotion()) {
        return false;
      }
      if (richRealtimeAtIndex !== undefined) {
        return stepIndex === richRealtimeAtIndex;
      }
      return hapticsIntensity === 'full';
    },
    [hapticsIntensity, richRealtimeAtIndex],
  );

  return (
    <View style={cardStyle}>
      <View onLayout={onTrackLayout}>
        <View style={{ height: TICK_ROW_H, position: 'relative', marginBottom: 2 }}>
          {trackWidth > 0 &&
            choices.map((choice, i) => {
              const active = i === index;
              const cx = choiceAnchorX(trackWidth, i, choiceCount);
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
          {trackWidth > 0 && railWidth > 0 && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: railLeft,
                width: railWidth,
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
                if (previewHapticAtIndex) {
                  previewHapticAtIndex(clamped);
                } else {
                  fireSliderNotchHaptic();
                }
              } else if (shouldUseRichRealtime(clamped)) {
                const dist = Math.abs(raw - clamped);
                setRealtimeHaptic(Math.max(0.12, 1 - dist * 0.4), 0.42);
              }
              const next = choices[clamped];
              if (next !== undefined) onChange(next);
            }}
            onSlidingComplete={() => stopRealtimeHaptic()}
            minimumTrackTintColor={color.accent.primary}
            maximumTrackTintColor={color.background.tertiary}
            thumbTintColor={color.icon.onAccent}
            style={{
              width: trackWidth > 0 ? trackWidth - sliderMargin * 2 : '100%',
              height: SLIDER_ROW_H,
              marginHorizontal: sliderMargin,
              alignSelf: 'center',
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', height: LABEL_ROW_H, marginTop: 4 }}>
          {choices.map((choice, i) => {
            const active = i === index;
            return (
              <View
                key={choice}
                pointerEvents="none"
                style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}
              >
                <Text
                  className={`text-xs leading-4 ${active ? 'font-semibold' : 'font-normal'}`}
                  style={{
                    color: active ? color.accent.primary : color.text.muted,
                    textAlign: 'center',
                  }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
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
