import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  seconds: number;
  totalSeconds: number;
  tintColor: string;
};

export function GithubConnectCountdownBadge({ seconds, totalSeconds, tintColor }: Props) {
  const size = 22;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const center = size / 2;
  const remaining = Math.max(0, Math.min(1, seconds / totalSeconds));
  const arcLength = circumference * remaining;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={tintColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          color: tintColor,
          fontVariant: ['tabular-nums'],
          lineHeight: 12,
        }}
      >
        {seconds}
      </Text>
    </View>
  );
}
