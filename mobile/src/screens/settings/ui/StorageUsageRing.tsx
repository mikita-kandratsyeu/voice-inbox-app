import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { LayoutChangeEvent, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type StorageRingSegmentId = 'audio' | 'transcript' | 'ai' | 'cache' | 'models';

export type StorageRingSegment = {
  id: StorageRingSegmentId;
  color: string;
  bytes: number;
};

type Props = {
  segments: StorageRingSegment[];
  totalBytes: number;
  selectedIds: StorageRingSegmentId[];
  onToggleSegment: (id: StorageRingSegmentId) => void;
  /** Tap donut hole / outside ring */
  onClearSelection: () => void;
  /** Center title (e.g. total used or selection summary) */
  centerTitle: string;
  /** Center value (formatted size) */
  centerValue: string;
  /** Hint under the chart */
  tapHint: string;
  color: Colors;
  isLoading?: boolean;
};

const R = 94;
const STROKE = 26;
const CIRC = 2 * Math.PI * R;
const SIZE = 268;
const CX = SIZE / 2;
const CY = SIZE / 2;
/** Outer diameter of the stroke in SVG (= 2·R + strokeWidth; stroke centered on r=R). */
const RING_OUTER_DIAM = 2 * R + STROKE;
/** Inner radius of the donut hole (stroke inner edge). */
const RING_INNER_R = R - STROKE / 2;

const INNER_HIT = RING_INNER_R - 6;
const OUTER_HIT = R + STROKE / 2 + 10;

function angleToSegmentId(
  angle01: number,
  fracs: { id: StorageRingSegmentId; f: number }[],
): StorageRingSegmentId | null {
  let acc = 0;
  for (const { id, f } of fracs) {
    if (f <= 0) continue;
    acc += f;
    if (angle01 < acc) return id;
  }
  return fracs.filter((x) => x.f > 0).at(-1)?.id ?? null;
}

export const StorageUsageRing = ({
  segments,
  totalBytes,
  selectedIds,
  onToggleSegment,
  onClearSelection,
  centerTitle,
  centerValue,
  tapHint,
  color,
  isLoading,
}: Props) => {
  const layout = React.useRef({ width: SIZE, height: SIZE });
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [progress, segments, totalBytes]);

  const { fracs, arcs, totalPositive } = useMemo(() => {
    const raw = segments.map((s) => ({ id: s.id, bytes: Math.max(0, s.bytes), color: s.color }));
    const sumBytes = raw.reduce((a, s) => a + s.bytes, 0);
    const denom = sumBytes > 0 ? sumBytes : 1;
    const fracsList = raw.map((s) => ({
      id: s.id,
      f: s.bytes / denom,
      color: s.color,
      len: (s.bytes / denom) * CIRC,
    }));
    const minVisual = 0.018;
    const positive = fracsList.filter((x) => x.f > 0);
    const adjusted = fracsList.map((row) => {
      if (row.f <= 0) return { ...row, drawF: 0, len: 0 };
      if (row.f < minVisual && positive.length > 0) {
        return { ...row, drawF: minVisual, len: minVisual * CIRC };
      }
      return { ...row, drawF: row.f, len: row.f * CIRC };
    });
    const drawSum = adjusted.reduce((a, s) => a + s.drawF, 0);
    const norm = drawSum > 0 ? drawSum : 1;
    const arcsList = adjusted.map((s) => ({
      id: s.id,
      color: s.color,
      len: (s.drawF / norm) * CIRC,
    }));
    const fracsForHit = raw.map((s) => ({ id: s.id, f: s.bytes / denom }));
    return { fracs: fracsForHit, arcs: arcsList, totalPositive: sumBytes > 0 };
  }, [segments]);

  const cumulativeBefore = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (let i = 0; i < arcs.length; i += 1) {
      out.push(acc);
      acc += arcs[i].len;
    }
    return out;
  }, [arcs]);

  const handleRingPress = useCallback(
    (x: number, y: number) => {
      const { width, height } = layout.current;
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < INNER_HIT || dist > OUTER_HIT) {
        onClearSelection();
        return;
      }
      let theta = Math.atan2(dy, dx) + Math.PI / 2;
      if (theta < 0) theta += Math.PI * 2;
      if (theta > Math.PI * 2) theta -= Math.PI * 2;
      const angle01 = theta / (Math.PI * 2);
      const id = angleToSegmentId(angle01, fracs);
      if (id == null) return;
      onToggleSegment(id);
    },
    [fracs, onClearSelection, onToggleSegment],
  );

  const selectedCount = selectedIds.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  if (isLoading) {
    return (
      <View style={{ width: '100%', alignItems: 'center' }}>
        <View
          style={{
            width: SIZE,
            height: SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: RING_OUTER_DIAM,
              height: RING_OUTER_DIAM,
              borderRadius: RING_OUTER_DIAM / 2,
              borderWidth: STROKE,
              borderColor: color.background.tertiary,
            }}
          />
        </View>
        <View
          style={{
            marginTop: 1,
            height: 16,
            width: 200,
            borderRadius: 4,
            backgroundColor: color.background.tertiary,
          }}
        />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(320)} style={{ width: '100%', alignItems: 'center' }}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={tapHint}
        onPress={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          handleRingPress(locationX, locationY);
        }}
        onLayout={(e: LayoutChangeEvent) => {
          layout.current = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
        }}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <G rotation={-90} origin={`${CX}, ${CY}`}>
              <Circle
                cx={CX}
                cy={CY}
                r={R}
                stroke={color.background.tertiary}
                strokeWidth={STROKE}
                fill="none"
              />
              {arcs.map((arc, index) => {
                const prev = cumulativeBefore[index] ?? 0;
                const dimmed = selectedCount > 0 && !selectedSet.has(arc.id);
                return (
                  <RingArc
                    key={arc.id}
                    color={arc.color}
                    arcLen={arc.len}
                    strokeOffset={-prev}
                    dimmed={dimmed}
                    progress={progress}
                  />
                );
              })}
            </G>
          </Svg>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: Math.min(28, Math.round(RING_INNER_R * 0.22)),
            }}
            pointerEvents="none"
          >
            <Text
              style={{
                textAlign: 'center',
                color: color.text.secondary,
                fontSize: 12,
                fontWeight: '600',
                lineHeight: 16,
                maxWidth: RING_INNER_R * 1.75,
              }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {centerTitle}
            </Text>
            <Text
              style={{
                marginTop: 2,
                textAlign: 'center',
                color: color.text.primary,
                fontSize: 22,
                fontWeight: '700',
                lineHeight: 26,
                maxWidth: RING_INNER_R * 1.85,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
            >
              {!totalPositive && selectedCount === 0 ? '—' : centerValue}
            </Text>
          </View>
        </View>
      </Pressable>
      <Text
        style={{
          marginTop: 1,
          width: '100%',
          textAlign: 'center',
          color: color.text.secondary,
          fontSize: 13,
          lineHeight: 19,
        }}
      >
        {tapHint}
      </Text>
    </Animated.View>
  );
};

function RingArc({
  color: strokeColor,
  arcLen,
  strokeOffset,
  dimmed,
  progress,
}: {
  color: string;
  arcLen: number;
  strokeOffset: number;
  dimmed: boolean;
  progress: SharedValue<number>;
}) {
  const opacitySv = useSharedValue(1);

  useEffect(() => {
    opacitySv.value = withTiming(dimmed ? 0.3 : 1, { duration: 220 });
  }, [dimmed, opacitySv]);

  const animatedProps = useAnimatedProps(() => {
    const len = arcLen * progress.value;
    return {
      strokeDasharray: `${len} ${CIRC}`,
      strokeDashoffset: strokeOffset * progress.value,
      opacity: opacitySv.value,
    };
  });

  if (arcLen <= 0) return null;

  return (
    <AnimatedCircle
      cx={CX}
      cy={CY}
      r={R}
      stroke={strokeColor}
      strokeWidth={STROKE}
      fill="none"
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

/** List row: bullet + label/percent + size (Telegram-style breakdown). */
export const ROW_BULLET_SIZE = 22;
const ROW_CHECK_SIZE = 14;
/** Selected row fill under checkmark bullet. */
const ROW_SELECTED_TINT_ALPHA = 0.12;

export const StorageBreakdownRow = ({
  segment,
  label,
  valueLabel,
  percentLabel,
  selected,
  onPress,
  color,
  isLast,
}: {
  segment: StorageRingSegment;
  label: string;
  valueLabel: string;
  percentLabel: string;
  selected: boolean;
  onPress: () => void;
  color: Colors;
  isLast?: boolean;
}) => {
  const a11y = `${label}, ${percentLabel}, ${valueLabel}`;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y}
      onPress={onPress}
    >
      <View
        className="flex-row items-center px-4 py-3.5"
        style={[
          {
            minHeight: 52,
            backgroundColor: selected
              ? withAlphaHex(segment.color, ROW_SELECTED_TINT_ALPHA)
              : 'transparent',
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: color.border.default,
          },
        ]}
      >
        <View
          style={{
            width: ROW_BULLET_SIZE,
            height: ROW_BULLET_SIZE,
            borderRadius: ROW_BULLET_SIZE / 2,
            marginRight: 12,
            backgroundColor: segment.color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? (
            <Check color={color.icon.onAccent} size={ROW_CHECK_SIZE} strokeWidth={2.8} />
          ) : null}
        </View>
        <View
          className="min-w-0 flex-1 flex-shrink flex-row items-center pr-2"
          style={{ columnGap: 6 }}
        >
          <Text
            style={{
              flexShrink: 1,
              fontSize: 16,
              lineHeight: 21,
              color: color.text.primary,
              fontWeight: '500',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
          <Text
            style={{
              flexShrink: 0,
              fontSize: 16,
              lineHeight: 21,
              color: color.text.muted,
              fontVariant: ['tabular-nums'],
            }}
            numberOfLines={1}
          >
            {percentLabel}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 21,
            color: color.text.muted,
            fontVariant: ['tabular-nums'],
            flexShrink: 0,
            textAlign: 'right',
          }}
          numberOfLines={1}
        >
          {valueLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
