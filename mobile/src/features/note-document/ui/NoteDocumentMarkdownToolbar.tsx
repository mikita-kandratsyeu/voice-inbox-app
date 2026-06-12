import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListTodo,
  Minus,
  TextQuote,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, TouchableOpacity, View, type ViewStyle } from 'react-native';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { hapticSelection, selectPlatform } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';
import { FrostedChromeBackground } from '@/shared/ui';

import type { MarkdownEditAction } from '../lib/applyMarkdownEdit';

const TOOLBAR_CHROME_RADIUS = 12;
const TOOLBAR_FLOAT_TOP_PAD = 10;
const TOOLBAR_FLOAT_BOTTOM_PAD = 10;
const TOOLBAR_ROW_INNER_HEIGHT = 4 * 2 + IOS_MIN_TOUCH_TARGET;
const TOOLBAR_ICON_SIZE = 18;

/** Per-action visual weight — matches rich editors (bold/heavy headings vs thin divider). */
const TOOLBAR_ACTION_VISUAL: Record<
  MarkdownEditAction,
  { strokeWidth: number; size?: number }
> = {
  bold: { strokeWidth: 2.85 },
  italic: { strokeWidth: 1.65 },
  heading2: { strokeWidth: 2.6, size: 19 },
  heading3: { strokeWidth: 2.1, size: 17 },
  bullet: { strokeWidth: 2 },
  task: { strokeWidth: 2 },
  quote: { strokeWidth: 1.85 },
  divider: { strokeWidth: 1.35 },
};

export const NOTE_DOCUMENT_TOOLBAR_FALLBACK_HEIGHT =
  TOOLBAR_FLOAT_TOP_PAD + TOOLBAR_FLOAT_BOTTOM_PAD + TOOLBAR_ROW_INNER_HEIGHT;

type ToolbarItem = {
  action: MarkdownEditAction;
  Icon: typeof Bold;
  strokeWidth: number;
  size: number;
};

type NoteDocumentMarkdownToolbarProps = {
  color: Colors;
  isTablet: boolean;
  onAction: (action: MarkdownEditAction) => void;
  disabled?: boolean;
};

function FrostedToolbarSurface({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color: Colors;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          borderRadius: TOOLBAR_CHROME_RADIUS,
          backgroundColor: 'transparent',
          ...selectPlatform({
            ios: {
              shadowColor: color.shadow.color,
              shadowOffset: { width: 0, height: FLOAT_TAB_IOS_SHADOW_OFFSET_Y },
              shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
              shadowRadius: FLOAT_TAB_IOS_SHADOW_RADIUS,
            },
            android: { elevation: 8 },
            default: {},
          }),
        },
        style,
      ]}
    >
      <View style={{ borderRadius: TOOLBAR_CHROME_RADIUS, overflow: 'hidden' }}>
        <FrostedChromeBackground borderRadius={TOOLBAR_CHROME_RADIUS} />
        {children}
      </View>
    </View>
  );
}

function FormatButton({
  color,
  item,
  label,
  disabled,
  onAction,
}: {
  color: Colors;
  item: ToolbarItem;
  label: string;
  disabled: boolean;
  onAction: (action: MarkdownEditAction) => void;
}) {
  const { Icon, strokeWidth, size } = item;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.7}
      onPress={() => {
        if (disabled) return;
        hapticSelection();
        onAction(item.action);
      }}
      style={{
        minHeight: IOS_MIN_TOUCH_TARGET,
        minWidth: IOS_MIN_TOUCH_TARGET,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon size={size} color={color.text.secondary} strokeWidth={strokeWidth} />
    </TouchableOpacity>
  );
}

export function NoteDocumentMarkdownToolbar({
  color,
  isTablet,
  onAction,
  disabled = false,
}: NoteDocumentMarkdownToolbarProps) {
  const { t } = useTranslation();

  const items = useMemo<ToolbarItem[]>(
    () =>
      (
        [
          { action: 'bold', Icon: Bold },
          { action: 'italic', Icon: Italic },
          { action: 'heading2', Icon: Heading2 },
          { action: 'heading3', Icon: Heading3 },
          { action: 'bullet', Icon: List },
          { action: 'task', Icon: ListTodo },
          { action: 'quote', Icon: TextQuote },
          { action: 'divider', Icon: Minus },
        ] as const
      ).map(({ action, Icon }) => {
        const visual = TOOLBAR_ACTION_VISUAL[action];
        return {
          action,
          Icon,
          strokeWidth: visual.strokeWidth,
          size: visual.size ?? TOOLBAR_ICON_SIZE,
        };
      }),
    [],
  );

  const labelFor = (action: MarkdownEditAction) => t(`recordingDetail.document.toolbar.${action}`);

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: isTablet ? 48 : 16,
        paddingTop: TOOLBAR_FLOAT_TOP_PAD,
        paddingBottom: TOOLBAR_FLOAT_BOTTOM_PAD,
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
        backgroundColor: color.background.primary,
      }}
    >
      <FrostedToolbarSurface color={color}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="flex-row" style={{ padding: 4, gap: 4 }}>
            {items.map((item) => (
              <FormatButton
                key={item.action}
                color={color}
                item={item}
                label={labelFor(item.action)}
                disabled={disabled}
                onAction={onAction}
              />
            ))}
          </View>
        </ScrollView>
      </FrostedToolbarSurface>
    </View>
  );
}
