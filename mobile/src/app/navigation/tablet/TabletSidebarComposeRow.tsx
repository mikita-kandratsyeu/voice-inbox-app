import { Mic, SquarePen } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, selectPlatform } from '@/shared/lib';
import { Button } from '@/shared/ui';

import {
  TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE,
  TABLET_SIDEBAR_NAV_ITEM_RADIUS,
} from './tabletSidebarMetrics';
import { TABLET_SIDEBAR_LABEL_FONT_SIZE } from './tabletSidebarTypography';

const COMPOSE_BUTTON_RADIUS = 14;
const COMPOSE_BUTTON_HEIGHT = 54;
const COMPOSE_ROW_GAP = 8;
const ICON_ACTION_SIZE = COMPOSE_BUTTON_HEIGHT;

const styles = StyleSheet.create({
  importSpinner: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

type TabletSidebarComposeRowProps = {
  color: Colors;
  collapsed?: boolean;
  onRecord: () => void;
  onRecordLongPress: () => void;
  onTextNote: () => void;
  isImporting?: boolean;
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
  collapsed = false,
  onRecord,
  onRecordLongPress,
  onTextNote,
  isImporting = false,
}: TabletSidebarComposeRowProps) {
  const { t } = useTranslation();

  if (collapsed) {
    const iconSize = TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE;
    return (
      <View style={{ width: '100%', alignItems: 'center', gap: COMPOSE_ROW_GAP }}>
        <View style={{ width: iconSize, height: iconSize }}>
          <Button
            variant="primary"
            iconOnly
            size="lg"
            color={color}
            icon={<Mic size={22} color={color.icon.onAccent} strokeWidth={2.4} />}
            accessibilityLabel={t('tablet.sidebar.newRecording')}
            accessibilityHint={t('inbox.emptyImportHint')}
            accessibilityState={{ busy: isImporting }}
            activeOpacity={0.9}
            disabled={isImporting}
            onPress={() => {
              if (isImporting) return;
              hapticSelection();
              onRecord();
            }}
            onLongPress={() => {
              if (isImporting) return;
              hapticSelection();
              onRecordLongPress();
            }}
            className="rounded-[14px]"
            containerStyle={{
              width: iconSize,
              height: iconSize,
              minHeight: iconSize,
              borderRadius: TABLET_SIDEBAR_NAV_ITEM_RADIUS,
              paddingVertical: 0,
              backgroundColor: color.accent.primary,
              opacity: isImporting ? 0.7 : 1,
              ...iconActionShadow(color, color.accent.primary),
            }}
          />
          {isImporting ? (
            <View pointerEvents="none" style={styles.importSpinner}>
              <ActivityIndicator size="small" color={color.icon.onAccent} />
            </View>
          ) : null}
        </View>

        <Button
          variant="secondary"
          iconOnly
          size="lg"
          color={color}
          icon={<SquarePen size={22} color={color.text.primary} strokeWidth={2.2} />}
          accessibilityLabel={t('textNote.openCreate')}
          activeOpacity={0.85}
          onPress={() => {
            hapticSelection();
            onTextNote();
          }}
          className="rounded-[14px]"
          containerStyle={{
            width: iconSize,
            height: iconSize,
            minHeight: iconSize,
            borderRadius: TABLET_SIDEBAR_NAV_ITEM_RADIUS,
            paddingVertical: 0,
            backgroundColor: color.background.tertiary,
            borderWidth: 1,
            borderColor: color.border.default,
          }}
        />
      </View>
    );
  }

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
          label={t('tablet.sidebar.startRecording')}
          labelStyle={{ fontSize: TABLET_SIDEBAR_LABEL_FONT_SIZE, fontWeight: '600' }}
          icon={<Mic size={22} color={color.icon.onAccent} strokeWidth={2.4} />}
          accessibilityLabel={t('tablet.sidebar.newRecording')}
          accessibilityHint={t('inbox.emptyImportHint')}
          accessibilityState={{ busy: isImporting }}
          activeOpacity={0.9}
          disabled={isImporting}
          onPress={() => {
            if (isImporting) return;
            hapticSelection();
            onRecord();
          }}
          onLongPress={() => {
            if (isImporting) return;
            hapticSelection();
            onRecordLongPress();
          }}
          className="rounded-[14px]"
          containerStyle={{
            minHeight: COMPOSE_BUTTON_HEIGHT,
            height: COMPOSE_BUTTON_HEIGHT,
            borderRadius: COMPOSE_BUTTON_RADIUS,
            paddingVertical: 0,
            opacity: isImporting ? 0.7 : 1,
            ...iconActionShadow(color, color.accent.primary),
          }}
        />
        {isImporting ? (
          <View pointerEvents="none" style={styles.importSpinner}>
            <ActivityIndicator size="small" color={color.icon.onAccent} />
          </View>
        ) : null}
      </View>

      <Button
        variant="secondary"
        iconOnly
        size="lg"
        color={color}
        icon={<SquarePen size={22} color={color.text.primary} strokeWidth={2.2} />}
        accessibilityLabel={t('textNote.openCreate')}
        activeOpacity={0.85}
        onPress={() => {
          hapticSelection();
          onTextNote();
        }}
        className="rounded-[14px]"
        containerStyle={{
          width: ICON_ACTION_SIZE,
          height: ICON_ACTION_SIZE,
          borderRadius: COMPOSE_BUTTON_RADIUS,
          paddingVertical: 0,
          backgroundColor: color.background.tertiary,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      />
    </View>
  );
}
