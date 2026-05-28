import { FileAudio, Mic, SquarePen } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, selectPlatform } from '@/shared/lib';
import { Button } from '@/shared/ui';

import { TABLET_SIDEBAR_LABEL_FONT_SIZE } from './tabletSidebarTypography';

const COMPOSE_BUTTON_RADIUS = 14;
const COMPOSE_BUTTON_HEIGHT = 54;
const COMPOSE_ROW_GAP = 8;
const ICON_ACTION_SIZE = COMPOSE_BUTTON_HEIGHT;

type TabletSidebarComposeRowProps = {
  color: Colors;
  onRecord: () => void;
  onTextNote: () => void;
  onImportAudio: () => void;
  importDisabled?: boolean;
};

function iconActionShadow(color: Colors, shadowColor: string) {
  return selectPlatform({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  });
}

export function TabletSidebarComposeRow({
  color,
  onRecord,
  onTextNote,
  onImportAudio,
  importDisabled = false,
}: TabletSidebarComposeRowProps) {
  const { t } = useTranslation();

  const textNoteBg = color.accent.models;
  const importBg = color.accent.transcript;
  const importIconColor = importDisabled ? color.text.muted : color.icon.onAccent;

  return (
    <View
      style={{
        width: '100%',
        height: COMPOSE_BUTTON_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: COMPOSE_ROW_GAP,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, height: COMPOSE_BUTTON_HEIGHT }}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          color={color}
          label={t('tablet.sidebar.recordShort')}
          labelStyle={{ fontSize: TABLET_SIDEBAR_LABEL_FONT_SIZE, fontWeight: '600' }}
          icon={<Mic size={22} color={color.icon.onAccent} strokeWidth={2.4} />}
          accessibilityLabel={t('tablet.sidebar.newRecording')}
          activeOpacity={0.9}
          onPress={() => {
            hapticSelection();
            onRecord();
          }}
          className="rounded-[14px]"
          containerStyle={{
            minHeight: COMPOSE_BUTTON_HEIGHT,
            height: COMPOSE_BUTTON_HEIGHT,
            borderRadius: COMPOSE_BUTTON_RADIUS,
            paddingVertical: 0,
            ...iconActionShadow(color, color.accent.primary),
          }}
        />
      </View>

      <Button
        variant="icon"
        iconOnly
        size="lg"
        color={color}
        icon={<SquarePen size={22} color={color.icon.onAccent} strokeWidth={2.2} />}
        accessibilityLabel={t('textNote.openCreate')}
        activeOpacity={0.9}
        onPress={() => {
          hapticSelection();
          onTextNote();
        }}
        className="rounded-[14px]"
        containerStyle={{
          width: ICON_ACTION_SIZE,
          height: ICON_ACTION_SIZE,
          borderRadius: COMPOSE_BUTTON_RADIUS,
          backgroundColor: textNoteBg,
          ...iconActionShadow(color, textNoteBg),
        }}
      />

      <Button
        variant="icon"
        iconOnly
        size="lg"
        color={color}
        icon={<FileAudio size={22} color={importIconColor} strokeWidth={2.2} />}
        accessibilityLabel={t('tablet.sidebar.importAudio')}
        accessibilityState={{ disabled: importDisabled }}
        activeOpacity={0.9}
        disabled={importDisabled}
        onPress={() => {
          if (importDisabled) return;
          hapticSelection();
          onImportAudio();
        }}
        className="rounded-[14px]"
        containerStyle={{
          width: ICON_ACTION_SIZE,
          height: ICON_ACTION_SIZE,
          borderRadius: COMPOSE_BUTTON_RADIUS,
          backgroundColor: importDisabled ? color.background.tertiary : importBg,
          opacity: importDisabled ? 0.55 : 1,
          ...iconActionShadow(color, importBg),
        }}
      />
    </View>
  );
}
