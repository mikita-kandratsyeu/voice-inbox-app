import { Info, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react-native';
import React, { useRef } from 'react';
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
  onResetLayoutLongPress?: () => void;
  resetLayoutLongPressEnabled?: boolean;
  legendVisible: boolean;
  onToggleLegend: () => void;
  isReconciling?: boolean;
  reconcilingLabel?: string;
};

function ControlButton({
  color,
  onPress,
  onLongPress,
  delayLongPress = 350,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  children,
}: {
  color: Colors;
  onPress: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const longPressHandledRef = useRef(false);

  return (
    <Pressable
      onPress={() => {
        if (disabled || longPressHandledRef.current) {
          longPressHandledRef.current = false;
          return;
        }
        hapticLight();
        onPress();
      }}
      onLongPress={
        onLongPress
          ? () => {
              if (disabled) return;
              longPressHandledRef.current = true;
              hapticLight();
              onLongPress();
            }
          : undefined
      }
      delayLongPress={onLongPress ? delayLongPress : undefined}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.background.primary,
        borderWidth: 1,
        borderColor: color.border.default,
        opacity: disabled ? 0.45 : 1,
        shadowColor: color.shadow.color,
        shadowOpacity: color.shadow.opacity * 0.6,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
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
  onResetLayoutLongPress,
  resetLayoutLongPressEnabled = false,
  legendVisible,
  onToggleLegend,
  isReconciling = false,
  reconcilingLabel,
}: GraphControlsProps) {
  const { t } = useTranslation();
  const bottomOffset = bottomInset + 16;
  const showStatusLoader = isReconciling;
  const statusLabel = reconcilingLabel;

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
        {legendVisible && !showStatusLoader ? (
          <View
            style={{
              backgroundColor: color.background.primary,
              borderColor: color.border.default,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 10,
              minWidth: 196,
              maxWidth: 240,
              shadowColor: color.shadow.color,
              shadowOpacity: color.shadow.opacity * 0.7,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
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
            <LegendRow color={color} edgeKind="linked" label={t('notesGraph.legend.linked')} />
            <LegendRow color={color} edgeKind="contains" label={t('notesGraph.legend.tasks')} />
          </View>
        ) : null}

        {showStatusLoader ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={statusLabel}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              height: 44,
              paddingHorizontal: 14,
              borderRadius: 22,
              backgroundColor: color.background.primary,
              borderWidth: 1,
              borderColor: color.border.default,
              maxWidth: 240,
              shadowColor: color.shadow.color,
              shadowOpacity: color.shadow.opacity * 0.6,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            <ActivityIndicator size="small" color={color.accent.primary} />
            <Text
              style={{
                color: color.text.primary,
                fontSize: 13,
                fontWeight: '600',
                lineHeight: 17,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {statusLabel}
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
              size={20}
              color={legendVisible ? color.accent.primary : color.text.secondary}
              strokeWidth={2.4}
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
        <View style={{ gap: 10 }}>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onZoomIn}
            accessibilityLabel={t('notesGraph.controls.zoomIn')}
          >
            <Plus size={20} color={color.text.primary} strokeWidth={2.4} />
          </ControlButton>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onZoomOut}
            accessibilityLabel={t('notesGraph.controls.zoomOut')}
          >
            <Minus size={20} color={color.text.primary} strokeWidth={2.4} />
          </ControlButton>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onFit}
            accessibilityLabel={t('notesGraph.controls.fit')}
          >
            <Maximize2 size={20} color={color.text.primary} strokeWidth={2.4} />
          </ControlButton>
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onReset}
            onLongPress={resetLayoutLongPressEnabled ? onResetLayoutLongPress : undefined}
            accessibilityLabel={t('notesGraph.controls.reset')}
            accessibilityHint={
              resetLayoutLongPressEnabled
                ? t('notesGraph.controls.resetLayoutLongPressHint')
                : undefined
            }
          >
            <RotateCcw size={20} color={color.text.primary} strokeWidth={2.4} />
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
