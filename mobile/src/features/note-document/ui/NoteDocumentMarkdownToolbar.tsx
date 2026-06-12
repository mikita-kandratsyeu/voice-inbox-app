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
import { ScrollView, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

import type { MarkdownEditAction } from '../lib/applyMarkdownEdit';
import { NOTE_DOCUMENT_CONTENT_MAX_WIDTH } from '../lib/noteDocumentLayout';

const TOOLBAR_FLOAT_TOP_PAD = 10;
const TOOLBAR_FLOAT_BOTTOM_PAD = 10;
const TOOLBAR_ROW_INNER_HEIGHT = 4 * 2 + IOS_MIN_TOUCH_TARGET;
const TOOLBAR_ICON_SIZE = 18;

const TOOLBAR_GROUPS: MarkdownEditAction[][] = [
  ['bold', 'italic'],
  ['heading2', 'heading3'],
  ['bullet', 'task'],
  ['quote', 'divider'],
];

/** Per-action visual weight — matches rich editors (bold/heavy headings vs thin divider). */
const TOOLBAR_ACTION_VISUAL: Record<MarkdownEditAction, { strokeWidth: number; size?: number }> = {
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
  horizontalPadding: number;
  onAction: (action: MarkdownEditAction) => void;
  disabled?: boolean;
};

function ToolbarGroupDivider({ color }: { color: Colors }) {
  return (
    <View
      style={{
        width: 1,
        alignSelf: 'stretch',
        marginVertical: 10,
        backgroundColor: color.border.default,
        opacity: 0.75,
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
      <Icon size={size} color={color.text.primary} strokeWidth={strokeWidth} />
    </TouchableOpacity>
  );
}

function ToolbarButtonRow({
  color,
  items,
  disabled,
  onAction,
  labelFor,
}: {
  color: Colors;
  items: ToolbarItem[];
  disabled: boolean;
  onAction: (action: MarkdownEditAction) => void;
  labelFor: (action: MarkdownEditAction) => string;
}) {
  const itemsByAction = useMemo(() => new Map(items.map((item) => [item.action, item])), [items]);

  return (
    <View className="flex-row items-center" style={{ gap: 2 }}>
      {TOOLBAR_GROUPS.map((group, groupIndex) => (
        <React.Fragment key={group.join('-')}>
          {groupIndex > 0 ? <ToolbarGroupDivider color={color} /> : null}
          <View className="flex-row" style={{ gap: 2 }}>
            {group.map((action) => {
              const item = itemsByAction.get(action);
              if (!item) return null;
              return (
                <FormatButton
                  key={item.action}
                  color={color}
                  item={item}
                  label={labelFor(item.action)}
                  disabled={disabled}
                  onAction={onAction}
                />
              );
            })}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export function NoteDocumentMarkdownToolbar({
  color,
  isTablet,
  horizontalPadding,
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

  const buttonRow = (
    <ToolbarButtonRow
      color={color}
      items={items}
      disabled={disabled}
      onAction={onAction}
      labelFor={labelFor}
    />
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: horizontalPadding,
        paddingTop: TOOLBAR_FLOAT_TOP_PAD,
        paddingBottom: TOOLBAR_FLOAT_BOTTOM_PAD,
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
        backgroundColor: color.background.primary,
        ...(isTablet && { alignItems: 'center' }),
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: isTablet ? NOTE_DOCUMENT_CONTENT_MAX_WIDTH : undefined,
          alignSelf: isTablet ? undefined : 'flex-start',
        }}
      >
        {isTablet ? (
          buttonRow
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {buttonRow}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
