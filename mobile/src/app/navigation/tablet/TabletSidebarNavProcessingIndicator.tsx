import { FileText, Languages, MessageCircle, Mic, Sparkles, UsersRound } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import type { TabletSidebarAiOperationKind } from './classifySidebarRecordAiOperation';

type Props = {
  color: Colors;
  isActive: boolean;
  kind?: TabletSidebarAiOperationKind | null;
};

const ICON_SIZE = 12;
const BOX = 24;
const STROKE = 2;
const RADIUS = (BOX - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.68;

function ProcessingIcon({
  kind,
  tint,
}: {
  kind: TabletSidebarAiOperationKind | null | undefined;
  tint: string;
}) {
  const stroke = 2.2;

  switch (kind) {
    case 'transcription':
      return <Mic size={ICON_SIZE} color={tint} strokeWidth={stroke} />;
    case 'speakers':
      return <UsersRound size={ICON_SIZE} color={tint} strokeWidth={stroke} />;
    case 'translation':
      return <Languages size={ICON_SIZE} color={tint} strokeWidth={stroke} />;
    case 'ask':
      return <MessageCircle size={ICON_SIZE} color={tint} strokeWidth={stroke} />;
    case 'summary':
      return <FileText size={ICON_SIZE} color={tint} strokeWidth={stroke} />;
    default:
      return <Sparkles size={ICON_SIZE} color={tint} strokeWidth={stroke} />;
  }
}

function ProcessingRing({ tint, trackTint }: { tint: string; trackTint: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const center = BOX / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: BOX,
          height: BOX,
        },
        spinStyle,
      ]}
    >
      <Svg width={BOX} height={BOX}>
        <Circle
          cx={center}
          cy={center}
          r={RADIUS}
          stroke={trackTint}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={RADIUS}
          stroke={tint}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE - ARC_LENGTH}`}
        />
      </Svg>
    </Animated.View>
  );
}

export function TabletSidebarNavProcessingIndicator({ color, isActive, kind }: Props) {
  const tint = isActive ? color.status.processing.text : color.accent.primary;
  const trackTint = withAlphaHex(tint, 0.22);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: BOX,
        height: BOX,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? color.status.processing.bg : color.background.tertiary,
        borderRadius: BOX / 2,
      }}
    >
      <ProcessingRing tint={tint} trackTint={trackTint} />
      <ProcessingIcon kind={kind} tint={tint} />
    </View>
  );
}
