import { Check, ChevronDown } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import type { Colors } from '@/shared/config';
import { formatStorageSharePercent, withAlphaHex } from '@/shared/lib';

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
  /** Tap the ring (anywhere on the chart) clears row selection */
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
/** Visible gap along the ring between segments (same units as `CIRC`). */
const SEGMENT_GAP = 5;
/** Do not spend more than this fraction of the ring on gaps (many tiny slices). */
const MAX_GAP_FRACTION = 0.09;
const SIZE = 268;
const CX = SIZE / 2;
const CY = SIZE / 2;
/** Outer diameter of the stroke in SVG (= 2·R + strokeWidth; stroke centered on r=R). */
const RING_OUTER_DIAM = 2 * R + STROKE;
/** Inner radius of the donut hole (stroke inner edge). */
const RING_INNER_R = R - STROKE / 2;

function RingCenterPercentChip({
  segments,
  totalBytes,
  color,
  selectedId,
}: {
  segments: StorageRingSegment[];
  totalBytes: number;
  color: Colors;
  selectedId: StorageRingSegmentId;
}) {
  const { t } = useTranslation();
  const atMostOne = t('storage.sharePercentAtMost1');
  const row = useMemo(() => {
    const seg = segments.find((s) => s.id === selectedId);
    if (!seg || seg.bytes <= 0 || totalBytes <= 0) return null;
    const label = formatStorageSharePercent(seg.bytes, totalBytes, atMostOne);
    return { dot: seg.color, label };
  }, [segments, selectedId, totalBytes, atMostOne]);

  if (!row) return null;

  return (
    <View
      style={{
        marginTop: 4,
        width: '100%',
        maxWidth: RING_INNER_R * 1.72,
        alignSelf: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          columnGap: 5,
          maxWidth: '100%',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: row.dot,
            flexShrink: 0,
          }}
        />
        <Text
          style={{
            fontSize: 11,
            lineHeight: 14,
            color: color.text.muted,
            fontWeight: '500',
            fontVariant: ['tabular-nums'],
            flexShrink: 1,
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {row.label}
        </Text>
      </View>
    </View>
  );
}

export const StorageUsageRing = ({
  segments,
  totalBytes,
  selectedIds,
  onClearSelection,
  centerTitle,
  centerValue,
  tapHint,
  color,
  isLoading,
}: Props) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [progress, segments, totalBytes]);

  const { arcs, cumulativeBefore, totalPositive } = useMemo(() => {
    const raw = segments.map((s) => ({ id: s.id, bytes: Math.max(0, s.bytes), color: s.color }));
    const sumBytes = raw.reduce((a, s) => a + s.bytes, 0);
    const denom = sumBytes > 0 ? sumBytes : 1;
    const fracsList = raw.map((s) => ({
      id: s.id,
      f: s.bytes / denom,
      color: s.color,
      len: (s.bytes / denom) * CIRC,
    }));
    const minVisual = 0.022;
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

    const nVisible = arcsList.filter((a) => a.len > 0).length;
    if (nVisible === 0) {
      return {
        arcs: arcsList,
        cumulativeBefore: arcsList.map(() => 0),
        totalPositive: sumBytes > 0,
      };
    }

    const rawGapsTotal = nVisible > 1 ? nVisible * SEGMENT_GAP : 0;
    const gapsTotal = Math.min(rawGapsTotal, CIRC * MAX_GAP_FRACTION);
    const gapUnit = nVisible > 1 ? gapsTotal / nVisible : 0;
    const available = CIRC - gapsTotal;
    const scale = available / CIRC;

    const arcsScaled = arcsList.map((a) => ({
      ...a,
      len: a.len > 0 ? a.len * scale : 0,
    }));

    const cumulative: number[] = [];
    let acc = 0;
    for (let i = 0; i < arcsScaled.length; i += 1) {
      cumulative.push(acc);
      if (arcsScaled[i].len > 0) {
        acc += arcsScaled[i].len + gapUnit;
      }
    }

    return { arcs: arcsScaled, cumulativeBefore: cumulative, totalPositive: sumBytes > 0 };
  }, [segments]);

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
        accessibilityRole="button"
        accessibilityLabel={tapHint}
        onPress={onClearSelection}
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
            {selectedCount === 1 && totalPositive ? (
              <RingCenterPercentChip
                segments={segments}
                totalBytes={totalBytes}
                color={color}
                selectedId={selectedIds[0]!}
              />
            ) : null}
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
      strokeLinecap="butt"
      animatedProps={animatedProps}
    />
  );
}

const CHEVRON_ROT_MS = 200;

/** Trailing column on breakdown rows (chevron or empty slot). Match expanded panel `paddingRight`. */
export const ROW_TRAIL_SLOT_W = 32;

function ExpandChevron({ expanded, iconColor }: { expanded: boolean; iconColor: string }) {
  const rotationDeg = useSharedValue(expanded ? 180 : 0);

  useEffect(() => {
    rotationDeg.value = withTiming(expanded ? 180 : 0, {
      duration: CHEVRON_ROT_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotationDeg]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDeg.value}deg` }],
  }));

  return (
    <View
      style={{
        width: ROW_TRAIL_SLOT_W,
        height: ROW_TRAIL_SLOT_W,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={spinStyle}>
        <ChevronDown size={20} color={iconColor} strokeWidth={2} />
      </Animated.View>
    </View>
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
  /** Shown only in accessibility (ring center shows % when exactly one row is selected). */
  percentLabel,
  selected,
  onSelectPress,
  color,
  showBottomBorder = true,
  hasExpandableDetails = false,
  detailsExpanded = false,
  onExpandPress,
  expandChevronAccessibilityLabel,
}: {
  segment: StorageRingSegment;
  label: string;
  valueLabel: string;
  percentLabel: string;
  selected: boolean;
  onSelectPress: () => void;
  color: Colors;
  showBottomBorder?: boolean;
  hasExpandableDetails?: boolean;
  detailsExpanded?: boolean;
  onExpandPress?: () => void;
  expandChevronAccessibilityLabel?: string;
}) => {
  const a11y = `${label}, ${percentLabel}, ${valueLabel}`;
  const expandable = Boolean(hasExpandableDetails && onExpandPress);

  return (
    <View
      style={[
        {
          backgroundColor: selected
            ? withAlphaHex(segment.color, ROW_SELECTED_TINT_ALPHA)
            : 'transparent',
          borderBottomWidth: showBottomBorder ? 1 : 0,
          borderBottomColor: color.border.default,
        },
      ]}
    >
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={a11y}
          onPress={onSelectPress}
          className="flex-row items-center py-3.5 pl-4"
          style={{ minHeight: 52 }}
          hitSlop={expandable ? { top: 8, bottom: 8, right: 4 } : undefined}
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
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={expandable ? { expanded: detailsExpanded } : { selected }}
          accessibilityLabel={expandable ? (expandChevronAccessibilityLabel ?? a11y) : a11y}
          onPress={expandable ? onExpandPress : onSelectPress}
          className="min-w-0 flex-1 flex-row items-center py-3.5 pr-2"
          style={{ minHeight: 52 }}
        >
          <View className="min-w-0 flex-1 flex-shrink pr-2" style={{ minWidth: 0 }}>
            <Text
              style={{
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
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
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
            <View
              style={{
                width: ROW_TRAIL_SLOT_W,
                minWidth: ROW_TRAIL_SLOT_W,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {expandable ? (
                <ExpandChevron expanded={detailsExpanded} iconColor={color.icon.muted} />
              ) : null}
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
};
