import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import type { Colors } from '@/shared/config';

import { FrostedChromeSurface } from './FrostedChromeSurface';

const GROUP_INNER_PAD = 4;

type FrostedHeaderButtonGroupProps = {
  children: ReactNode;
  color: Colors;
  style?: StyleProp<ViewStyle>;
};

/** Pill-shaped frosted chrome for grouped header icon actions. */
export function FrostedHeaderButtonGroup({
  children,
  color,
  style,
}: FrostedHeaderButtonGroupProps) {
  return (
    <FrostedChromeSurface color={color} borderRadius={9999} shadow="subtle" style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: GROUP_INNER_PAD,
        }}
      >
        {children}
      </View>
    </FrostedChromeSurface>
  );
}
