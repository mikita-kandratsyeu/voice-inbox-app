import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';

type AiOrganizeReviewListRowProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  color: Colors;
  onPress: () => void;
};

export function AiOrganizeReviewListRow({
  title,
  subtitle,
  selected,
  color,
  onPress,
}: AiOrganizeReviewListRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: subtitle ? 64 : 52,
        backgroundColor: color.background.card,
      }}
    >
      <View style={{ marginRight: 12 }}>
        {selected ? (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: color.accent.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={14} color="#ffffff" strokeWidth={2.5} />
          </View>
        ) : (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: color.border.default,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: color.text.primary }} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ marginTop: 2, fontSize: 13, color: color.text.secondary, lineHeight: 18 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function AiOrganizeReviewGroupedList({
  children,
  color,
}: {
  children: React.ReactNode;
  color: Colors;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      {children}
    </View>
  );
}

type AiOrganizeReviewListDividerProps = {
  isLast: boolean;
  color: Colors;
  children: React.ReactNode;
};

export function AiOrganizeReviewListDivider({
  isLast,
  color,
  children,
}: AiOrganizeReviewListDividerProps) {
  return (
    <View
      style={
        isLast
          ? undefined
          : { borderBottomWidth: 1, borderBottomColor: color.border.default }
      }
    >
      {children}
    </View>
  );
}

const sectionTitleStyle = {
  fontSize: 12,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
};

export function AiOrganizeReviewSectionHeader({
  title,
  color,
}: {
  title: string;
  color: Colors;
}) {
  return (
    <Text
      style={{
        ...sectionTitleStyle,
        color: color.text.secondary,
        marginBottom: 8,
        paddingHorizontal: 4,
      }}
    >
      {title}
    </Text>
  );
}

type AiOrganizeReviewSelectToggleProps = {
  allSelected: boolean;
  noneSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  color: Colors;
};

export function AiOrganizeReviewSelectToggle({
  allSelected,
  noneSelected,
  onSelectAll,
  onDeselectAll,
  color,
}: AiOrganizeReviewSelectToggleProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: color.background.tertiary,
        borderRadius: 10,
        padding: 4,
        marginBottom: 16,
      }}
    >
      <TouchableOpacity
        onPress={onSelectAll}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('importExport.selectAll')}
        accessibilityState={{ selected: allSelected }}
        style={{
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: allSelected ? color.accent.primary : 'transparent',
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: allSelected ? color.icon.onAccent : color.accent.primary,
          }}
        >
          {t('importExport.selectAll')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDeselectAll}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('importExport.deselectAll')}
        accessibilityState={{ selected: noneSelected }}
        style={{
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: noneSelected ? color.accent.primary : 'transparent',
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: noneSelected ? color.icon.onAccent : color.text.secondary,
          }}
        >
          {t('importExport.deselectAll')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
