import { Check } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';

import { SheetRowIconLeading } from './SheetRowIconLeading';

export type SheetEnumOptionIconTone = {
  accentHex: string;
};

export type SheetEnumOption<T extends string | number> = {
  value: T;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  iconTone?: SheetEnumOptionIconTone;
};

type SheetEnumOptionListProps<T extends string | number> = {
  options: SheetEnumOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  color: Colors;
  /** @default 16 */
  borderRadius?: number;
  getKey?: (value: T) => string;
};

export function SheetEnumOptionList<T extends string | number>({
  options,
  selected,
  onSelect,
  color,
  borderRadius = 16,
  getKey = (value) => String(value),
}: SheetEnumOptionListProps<T>) {
  return (
    <View
      style={{
        borderRadius,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      {options.map((option, index) => {
        const isSelected = option.value === selected;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={getKey(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: option.icon ? 14 : 16,
              paddingVertical: 14,
              borderBottomWidth: isLast ? 0 : 1,
              borderBottomColor: color.border.default,
              flexDirection: 'row',
              alignItems: option.icon ? 'stretch' : 'center',
              gap: option.icon ? 12 : 0,
              minHeight: option.icon ? 52 : undefined,
            }}
          >
            {option.icon && option.iconTone ? (
              <SheetRowIconLeading
                icon={option.icon}
                color={color}
                accentHex={option.iconTone.accentHex}
              />
            ) : null}
            <View
              style={{
                flex: 1,
                justifyContent: option.icon ? 'center' : undefined,
                paddingRight: option.hint ? 12 : 0,
              }}
            >
              <Text style={{ fontSize: 16, color: color.text.primary }}>{option.label}</Text>
              {option.hint ? (
                <Text
                  style={{
                    fontSize: 13,
                    lineHeight: 18,
                    color: color.text.muted,
                    marginTop: 4,
                  }}
                >
                  {option.hint}
                </Text>
              ) : null}
            </View>
            {isSelected ? (
              <View style={{ alignSelf: 'center' }}>
                <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
