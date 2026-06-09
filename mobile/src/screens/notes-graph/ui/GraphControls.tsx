import { Info, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

import { getLegendEdgeStrokeStyle } from '../lib/graphEdgeStyles';
import type { GraphEdgeKind } from '../lib/graphTypes';

type GraphControlsProps = {
  color: Colors;
  bottomInset: number;
  disabled?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  legendVisible: boolean;
  onToggleLegend: () => void;
  isReconciling?: boolean;
  reconcilingLabel?: string;
};

function ControlButton({
  color,
  onPress,
  accessibilityLabel,
  disabled = false,
  children,
}: {
  color: Colors;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        hapticLight();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.background.primary,
        borderWidth: 1,
        borderColor: color.border.default,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </Pressable>
  );
}

export function GraphControls({
  color,
  bottomInset,
  disabled = false,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  legendVisible,
  onToggleLegend,
  isReconciling = false,
  reconcilingLabel,
}: GraphControlsProps) {
  const { t } = useTranslation();
  const bottomOffset = bottomInset + 16;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 16,
          bottom: bottomOffset,
          gap: 8,
          alignItems: 'flex-start',
          maxWidth: 240,
        }}
      >
        {legendVisible && !isReconciling ? (
          <View
            style={{
              backgroundColor: color.background.primary,
              borderColor: color.border.default,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 11,
              gap: 9,
              minWidth: 196,
              maxWidth: 240,
            }}
          >
            <LegendRow color={color} edgeKind="similar" label={t('notesGraph.legend.similar')} />
            <LegendRow
              color={color}
              edgeKind="sharedTag"
              label={t('notesGraph.legend.sharedTag')}
            />
            <LegendRow
              color={color}
              edgeKind="sameFolder"
              label={t('notesGraph.legend.sameFolder')}
            />
            <LegendRow color={color} edgeKind="contains" label={t('notesGraph.legend.tasks')} />
          </View>
        ) : null}

        {isReconciling ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={reconcilingLabel}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 40,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: color.background.primary,
              borderWidth: 1,
              borderColor: color.border.default,
              maxWidth: 240,
            }}
          >
            <ActivityIndicator size="small" color={color.accent.primary} />
            <Text
              style={{
                color: color.text.primary,
                fontSize: 13,
                fontWeight: '500',
                lineHeight: 17,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {reconcilingLabel}
            </Text>
          </View>
        ) : (
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onToggleLegend}
            accessibilityLabel={t('notesGraph.legend.toggle')}
          >
            <Info
              size={18}
              color={legendVisible ? color.accent.primary : color.text.secondary}
              strokeWidth={2.2}
            />
          </ControlButton>
        )}
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 16,
          bottom: bottomOffset,
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        <View style={{ gap: 8 }}>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onZoomIn}
            accessibilityLabel={t('notesGraph.controls.zoomIn')}
          >
            <Plus size={18} color={color.text.primary} strokeWidth={2.2} />
          </ControlButton>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onZoomOut}
            accessibilityLabel={t('notesGraph.controls.zoomOut')}
          >
            <Minus size={18} color={color.text.primary} strokeWidth={2.2} />
          </ControlButton>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onFit}
            accessibilityLabel={t('notesGraph.controls.fit')}
          >
            <Maximize2 size={18} color={color.text.primary} strokeWidth={2.2} />
          </ControlButton>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onReset}
            accessibilityLabel={t('notesGraph.controls.reset')}
          >
            <RotateCcw size={18} color={color.text.primary} strokeWidth={2.2} />
          </ControlButton>
        </View>
      </View>
    </>
  );
}

const LEGEND_SWATCH_WIDTH = 36;
const LEGEND_SWATCH_HEIGHT = 14;

function LegendLineSample({ edgeKind, color }: { edgeKind: GraphEdgeKind; color: Colors }) {
  const style = getLegendEdgeStrokeStyle(edgeKind, color);
  const lineY = LEGEND_SWATCH_HEIGHT / 2;

  return (
    <View
      style={{
        width: LEGEND_SWATCH_WIDTH,
        height: LEGEND_SWATCH_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        backgroundColor: color.background.tertiary,
      }}
    >
      <Svg width={LEGEND_SWATCH_WIDTH - 8} height={LEGEND_SWATCH_HEIGHT}>
        <Line
          x1={0}
          y1={lineY}
          x2={LEGEND_SWATCH_WIDTH - 8}
          y2={lineY}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
          strokeLinecap={style.strokeLinecap ?? 'round'}
          opacity={style.opacity}
        />
      </Svg>
    </View>
  );
}

function LegendRow({
  color,
  edgeKind,
  label,
}: {
  color: Colors;
  edgeKind: GraphEdgeKind;
  label: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 22 }}>
      <LegendLineSample edgeKind={edgeKind} color={color} />
      <Text
        style={{
          color: color.text.primary,
          fontSize: 13,
          fontWeight: '500',
          lineHeight: 17,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
