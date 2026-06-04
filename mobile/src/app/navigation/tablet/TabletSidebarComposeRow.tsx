import { SquarePen } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, selectPlatform } from '@/shared/lib';
import { Button, RecordVoiceIcon } from '@/shared/ui';

import {
  TABLET_SIDEBAR_COMPOSE_BUTTON_HEIGHT,
  TABLET_SIDEBAR_COMPOSE_BUTTON_RADIUS,
  TABLET_SIDEBAR_COMPOSE_ICON_SIZE,
} from './tabletSidebarMetrics';
import { TABLET_SIDEBAR_COMPOSE_LABEL_FONT_SIZE } from './tabletSidebarTypography';

const COMPOSE_ROW_GAP = 8;
const ICON_ACTION_SIZE = TABLET_SIDEBAR_COMPOSE_BUTTON_HEIGHT;

type TabletSidebarComposeRowProps = {
  color: Colors;
  onRecord: () => void;
  onRecordLongPress: () => void;
  onTextNote: () => void;
};

function iconActionShadow(color: Colors, shadowColor: string) {
  return selectPlatform({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.24,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  });
}

export function TabletSidebarComposeRow({
  color,
  onRecord,
  onRecordLongPress,
  onTextNote,
}: TabletSidebarComposeRowProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        width: '100%',
        height: TABLET_SIDEBAR_COMPOSE_BUTTON_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: COMPOSE_ROW_GAP,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, height: TABLET_SIDEBAR_COMPOSE_BUTTON_HEIGHT }}>
        <Button
          variant="primary"
          size="md"
          fullWidth
          color={color}
          label={t('tablet.sidebar.startRecording')}
          labelStyle={{ fontSize: TABLET_SIDEBAR_COMPOSE_LABEL_FONT_SIZE, fontWeight: '600' }}
          icon={
            <RecordVoiceIcon
              size={TABLET_SIDEBAR_COMPOSE_ICON_SIZE}
              color={color.icon.onAccent}
              strokeWidth={2.4}
            />
          }
          accessibilityLabel={t('tablet.sidebar.newRecording')}
          accessibilityHint={t('inbox.emptyImportHint')}
          activeOpacity={0.9}
          onPress={() => {
            hapticSelection();
            onRecord();
          }}
          onLongPress={() => {
            hapticSelection();
            onRecordLongPress();
          }}
          className="rounded-[12px]"
          containerStyle={{
            minHeight: TABLET_SIDEBAR_COMPOSE_BUTTON_HEIGHT,
            height: TABLET_SIDEBAR_COMPOSE_BUTTON_HEIGHT,
            borderRadius: TABLET_SIDEBAR_COMPOSE_BUTTON_RADIUS,
            paddingVertical: 0,
            ...iconActionShadow(color, color.accent.primary),
          }}
        />
      </View>

      <Button
        variant="secondary"
        iconOnly
        size="md"
        color={color}
        icon={
          <SquarePen
            size={TABLET_SIDEBAR_COMPOSE_ICON_SIZE}
            color={color.text.primary}
            strokeWidth={2.2}
          />
        }
        accessibilityLabel={t('textNote.openCreate')}
        activeOpacity={0.85}
        onPress={() => {
          hapticSelection();
          onTextNote();
        }}
        className="rounded-[12px]"
        containerStyle={{
          width: ICON_ACTION_SIZE,
          height: ICON_ACTION_SIZE,
          borderRadius: TABLET_SIDEBAR_COMPOSE_BUTTON_RADIUS,
          paddingVertical: 0,
          backgroundColor: color.background.tertiary,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      />
    </View>
  );
}
