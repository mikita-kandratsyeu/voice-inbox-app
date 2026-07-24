import { Info, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react-native';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';
import { FROSTED_HEADER_ICON_SIZE, FrostedChromeSurface } from '@/shared/ui';

import { GraphLegendLineRow } from './GraphLegendSamples';

type GraphControlsProps = {
  color: Colors;
  bottomInset: number;
  disabled?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onResetLayoutLongPress?: () => void;
  resetVisible?: boolean;
  resetLayoutLongPressEnabled?: boolean;
  legendVisible: boolean;
  legendToggleVisible?: boolean;
  legendMaxWidth?: number;
  legendToggleLabel?: string;
  customLegend?: React.ReactNode;
  onToggleLegend: () => void;
  statusActive?: boolean;
  statusLabel?: string;
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
    <FrostedChromeSurface
      color={color}
      fixedSize={FROSTED_HEADER_ICON_SIZE}
      shadow="subtle"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
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
          width: FROSTED_HEADER_ICON_SIZE,
          height: FROSTED_HEADER_ICON_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Pressable>
    </FrostedChromeSurface>
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
  resetVisible = true,
  resetLayoutLongPressEnabled = false,
  legendVisible,
  legendToggleVisible = true,
  legendMaxWidth = 240,
  legendToggleLabel,
  customLegend,
  onToggleLegend,
  statusActive = false,
  statusLabel,
}: GraphControlsProps) {
  const { t } = useTranslation();
  const bottomOffset = bottomInset + 16;
  const showStatusLoader = statusActive;
  const resolvedStatusLabel = statusLabel ?? t('notesGraph.reconciling');

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
          maxWidth: legendMaxWidth,
        }}
      >
        {legendVisible && !showStatusLoader ? (
          <FrostedChromeSurface
            color={color}
            borderRadius={14}
            shadow="subtle"
            style={{ minWidth: 196, maxWidth: legendMaxWidth }}
          >
            <View
              style={{
                alignSelf: 'stretch',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
              }}
            >
              {customLegend ?? (
                <>
                  <GraphLegendLineRow
                    color={color}
                    edgeKind="similar"
                    label={t('notesGraph.legend.similar')}
                  />
                  <GraphLegendLineRow
                    color={color}
                    edgeKind="sharedTag"
                    label={t('notesGraph.legend.sharedTag')}
                  />
                  <GraphLegendLineRow
                    color={color}
                    edgeKind="sameFolder"
                    label={t('notesGraph.legend.sameFolder')}
                  />
                  <GraphLegendLineRow
                    color={color}
                    edgeKind="linked"
                    label={t('notesGraph.legend.linked')}
                  />
                  <GraphLegendLineRow
                    color={color}
                    edgeKind="contains"
                    label={t('notesGraph.legend.tasks')}
                  />
                </>
              )}
            </View>
          </FrostedChromeSurface>
        ) : null}

        {showStatusLoader ? (
          <FrostedChromeSurface
            color={color}
            borderRadius={22}
            shadow="subtle"
            style={{ maxWidth: 240 }}
          >
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={resolvedStatusLabel}
              style={{
                alignSelf: 'stretch',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                height: FROSTED_HEADER_ICON_SIZE,
                paddingHorizontal: 14,
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
                {resolvedStatusLabel}
              </Text>
            </View>
          </FrostedChromeSurface>
        ) : legendToggleVisible ? (
          <ControlButton
            color={color}
            disabled={disabled}
            onPress={onToggleLegend}
            accessibilityLabel={legendToggleLabel ?? t('notesGraph.legend.toggle')}
          >
            <Info
              size={20}
              color={legendVisible ? color.accent.primary : color.text.secondary}
              strokeWidth={2.4}
            />
          </ControlButton>
        ) : null}
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
          {resetVisible ? (
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
          ) : null}
        </View>
      </View>
    </>
  );
}
