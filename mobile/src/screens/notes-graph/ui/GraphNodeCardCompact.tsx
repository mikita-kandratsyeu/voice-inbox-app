import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

/** Compact record card - title only, reduced size for zoom level 0.3-0.7 */
export const GraphRecordNodeCardContentCompact = React.memo(
  function GraphRecordNodeCardContentCompact({ title, color }: { title: string; color: Colors }) {
    return (
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 8 }}>
        <Text
          numberOfLines={1}
          style={{
            color: color.text.primary,
            fontSize: 11,
            fontWeight: '600',
            lineHeight: 14,
            letterSpacing: -0.08,
          }}
        >
          {title}
        </Text>
      </View>
    );
  },
);

/** Compact task card - text only, reduced size for zoom level 0.3-0.7 */
export const GraphTaskNodeCardContentCompact = React.memo(function GraphTaskNodeCardContentCompact({
  text,
  color,
  isDone,
}: {
  text: string;
  color: Colors;
  isDone: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          borderWidth: 1.5,
          borderColor: isDone ? color.accent.primary : color.border.default,
          backgroundColor: isDone ? color.accent.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDone ? <CheckCircle2 size={6} color={color.background.primary} strokeWidth={3} /> : null}
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: isDone ? color.text.muted : color.text.primary,
          fontSize: 10,
          fontWeight: '500',
          lineHeight: 13,
          flex: 1,
          textDecorationLine: isDone ? 'line-through' : 'none',
        }}
      >
        {text}
      </Text>
    </View>
  );
});
