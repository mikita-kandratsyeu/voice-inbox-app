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
import { ScrollView, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { hapticSelection, selectPlatform } from '@/shared/lib';
import { Button, FrostedBottomChrome, FrostedChromeBackground } from '@/shared/ui';

import type { MarkdownEditAction } from '../lib/applyMarkdownEdit';

const TOOLBAR_CHROME_RADIUS = 14;
const TOOLBAR_BTN_SIZE = 52;
const TOOLBAR_ICON_SIZE = 22;
const TOOLBAR_RAIL_PAD = 6;
const TOOLBAR_TOP_PAD = 12;
const TOOLBAR_BOTTOM_PAD = 8;

export const NOTE_DOCUMENT_TOOLBAR_FALLBACK_HEIGHT =
  TOOLBAR_TOP_PAD + TOOLBAR_RAIL_PAD * 2 + TOOLBAR_BTN_SIZE + TOOLBAR_BOTTOM_PAD;

type ToolbarItem = {
  action: MarkdownEditAction;
  Icon: typeof Bold;
};

type NoteDocumentMarkdownToolbarProps = {
  color: Colors;
  insetsBottom: number;
  isTablet: boolean;
  onAction: (action: MarkdownEditAction) => void;
  disabled?: boolean;
};

function ToolbarRail({ color, children }: { color: Colors; children: React.ReactNode }) {
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
            android: { elevation: 6 },
            default: {},
          }),
        },
      ]}
    >
      <View style={{ borderRadius: TOOLBAR_CHROME_RADIUS, overflow: 'hidden' }}>
        <FrostedChromeBackground borderRadius={TOOLBAR_CHROME_RADIUS} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: TOOLBAR_RAIL_PAD,
            gap: TOOLBAR_RAIL_PAD,
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

function ToolbarSeparator({ color }: { color: Colors }) {
  return (
    <View
      style={{
        width: 1,
        height: 28,
        backgroundColor: color.border.default,
        opacity: 0.7,
        marginHorizontal: 2,
      }}
    />
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
  const { Icon } = item;

  return (
    <Button
      iconOnly
      size="lg"
      color={color}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={label}
      onPress={() => {
        if (disabled) return;
        hapticSelection();
        onAction(item.action);
      }}
      icon={<Icon size={TOOLBAR_ICON_SIZE} color={color.text.primary} strokeWidth={2.2} />}
      containerStyle={{
        width: TOOLBAR_BTN_SIZE,
        height: TOOLBAR_BTN_SIZE,
        backgroundColor: color.background.secondary,
        borderWidth: 1,
        borderColor: color.border.default,
      }}
    />
  );
}

export function NoteDocumentMarkdownToolbar({
  color,
  insetsBottom,
  isTablet,
  onAction,
  disabled = false,
}: NoteDocumentMarkdownToolbarProps) {
  const { t } = useTranslation();

  const groups = useMemo<ToolbarItem[][]>(
    () => [
      [
        { action: 'bold', Icon: Bold },
        { action: 'italic', Icon: Italic },
      ],
      [
        { action: 'heading2', Icon: Heading2 },
        { action: 'heading3', Icon: Heading3 },
      ],
      [
        { action: 'bullet', Icon: List },
        { action: 'task', Icon: ListTodo },
      ],
      [
        { action: 'quote', Icon: TextQuote },
        { action: 'divider', Icon: Minus },
      ],
    ],
    [],
  );

  const labelFor = (action: MarkdownEditAction) => t(`recordingDetail.document.toolbar.${action}`);

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={{ alignSelf: 'stretch' }}>
      <FrostedBottomChrome
        color={color}
        insetsBottom={insetsBottom}
        contentStyle={{
          paddingHorizontal: isTablet ? 48 : 16,
          paddingTop: TOOLBAR_TOP_PAD,
          paddingBottom: Math.max(insetsBottom, TOOLBAR_BOTTOM_PAD),
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <ToolbarRail color={color}>
            {groups.map((group, groupIndex) => (
              <React.Fragment key={group.map((item) => item.action).join('-')}>
                {groupIndex > 0 ? <ToolbarSeparator color={color} /> : null}
                {group.map((item) => (
                  <FormatButton
                    key={item.action}
                    color={color}
                    item={item}
                    label={labelFor(item.action)}
                    disabled={disabled}
                    onAction={onAction}
                  />
                ))}
              </React.Fragment>
            ))}
          </ToolbarRail>
        </ScrollView>
      </FrostedBottomChrome>
    </KeyboardStickyView>
  );
}
