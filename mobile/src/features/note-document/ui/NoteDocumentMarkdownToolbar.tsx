import { Bold, Italic, Strikethrough, Underline } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import type { StyleState } from 'react-native-enriched-markdown';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

import { NOTE_DOCUMENT_CONTENT_MAX_WIDTH } from '../lib/noteDocumentLayout';

const TOOLBAR_FLOAT_TOP_PAD = 10;
const TOOLBAR_FLOAT_BOTTOM_PAD = 10;
const TOOLBAR_ICON_SIZE = 18;

export type EnrichedMarkdownToolbarAction = 'bold' | 'italic' | 'strikethrough' | 'underline';

const TOOLBAR_ACTIONS: EnrichedMarkdownToolbarAction[] = [
  'bold',
  'italic',
  'strikethrough',
  'underline',
];

const TOOLBAR_ACTION_VISUAL: Record<
  EnrichedMarkdownToolbarAction,
  { strokeWidth: number; size?: number }
> = {
  bold: { strokeWidth: 2.85 },
  italic: { strokeWidth: 1.65 },
  strikethrough: { strokeWidth: 2 },
  underline: { strokeWidth: 2 },
};

const TOOLBAR_ICONS = {
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
  underline: Underline,
} as const;

const TOOLBAR_DIVIDER_HEIGHT = 1;

type NoteDocumentMarkdownToolbarProps = {
  color: Colors;
  isTablet: boolean;
  horizontalPadding: number;
  styleState: StyleState | null;
  onAction: (action: EnrichedMarkdownToolbarAction) => void;
  disabled?: boolean;
};

function isToolbarActionActive(
  action: EnrichedMarkdownToolbarAction,
  styleState: StyleState | null,
): boolean {
  if (!styleState) return false;

  switch (action) {
    case 'bold':
      return styleState.bold.isActive;
    case 'italic':
      return styleState.italic.isActive;
    case 'strikethrough':
      return styleState.strikethrough.isActive;
    case 'underline':
      return styleState.underline.isActive;
    default:
      return false;
  }
}

export const NoteDocumentMarkdownToolbar = React.memo(function NoteDocumentMarkdownToolbar({
  color,
  isTablet,
  horizontalPadding,
  styleState,
  onAction,
  disabled = false,
}: NoteDocumentMarkdownToolbarProps) {
  const { t } = useTranslation();

  const handlePress = useCallback(
    (action: EnrichedMarkdownToolbarAction) => {
      if (disabled) return;
      hapticSelection();
      onAction(action);
    },
    [disabled, onAction],
  );

  const buttonRow = (
    <View className="flex-row items-center" style={{ gap: 2 }}>
      {TOOLBAR_ACTIONS.map((action) => {
        const Icon = TOOLBAR_ICONS[action];
        const visual = TOOLBAR_ACTION_VISUAL[action];
        const isActive = isToolbarActionActive(action, styleState);

        return (
          <TouchableOpacity
            key={action}
            accessibilityRole="button"
            accessibilityLabel={t(`recordingDetail.document.toolbar.${action}`)}
            accessibilityHint={t(`recordingDetail.document.toolbar.${action}Hint`)}
            accessibilityState={{ disabled, selected: isActive }}
            disabled={disabled}
            activeOpacity={0.7}
            onPress={() => handlePress(action)}
            style={{
              minHeight: IOS_MIN_TOUCH_TARGET,
              minWidth: IOS_MIN_TOUCH_TARGET,
              paddingVertical: 10,
              paddingHorizontal: 8,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? color.background.tertiary : 'transparent',
              opacity: disabled ? 0.35 : 1,
            }}
          >
            <Icon
              size={visual.size ?? TOOLBAR_ICON_SIZE}
              color={isActive ? color.accent.primary : color.text.primary}
              strokeWidth={visual.strokeWidth}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        width: '100%',
        alignSelf: 'stretch',
        backgroundColor: color.background.primary,
      }}
    >
      <View
        style={{
          paddingHorizontal: horizontalPadding,
          paddingTop: TOOLBAR_FLOAT_TOP_PAD,
          paddingBottom: TOOLBAR_FLOAT_BOTTOM_PAD,
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
      <View
        style={{
          height: TOOLBAR_DIVIDER_HEIGHT,
          width: '100%',
          backgroundColor: color.border.default,
        }}
      />
    </View>
  );
});
