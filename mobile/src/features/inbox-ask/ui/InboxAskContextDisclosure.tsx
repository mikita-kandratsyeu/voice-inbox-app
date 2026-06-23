import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ChevronRight, Cloud, Shield } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import {
  SheetFooterButtons,
  useAppBottomSheetChrome,
  useBottomSheetContentPadding,
} from '@/shared/ui';

type InboxAskContextDisclosureProps = {
  color: Colors;
  notesUsed: number;
  notesTotal: number;
  notesDropped: number;
  noteTitles: string[];
};

export function InboxAskContextDisclosure({
  color,
  notesUsed,
  notesTotal,
  notesDropped,
  noteTitles,
}: InboxAskContextDisclosureProps) {
  const { t } = useTranslation();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const contentPadding = useBottomSheetContentPadding(20);
  const sheetChrome = useAppBottomSheetChrome({ surface: 'card' });
  const sheetRef = useRef<BottomSheetModal>(null);
  const isPrivate = aiExecutionMode === 'private_experimental';

  const sourcesLine = useMemo(() => {
    if (notesUsed > 0) {
      return t('inboxAsk.contextUsed', { used: notesUsed, total: notesTotal });
    }
    return t('inboxAsk.contextIdle', { total: notesTotal });
  }, [notesTotal, notesUsed, t]);

  const processingLine = isPrivate
    ? t('inboxAsk.contextProcessingPrivate')
    : t('inboxAsk.contextProcessingCloud');

  const openSheet = useCallback(() => {
    KeyboardController.dismiss();
    requestAnimationFrame(() => {
      sheetRef.current?.present();
    });
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const sheetBullets = useMemo(() => {
    const items: { key: string; text: string }[] = [
      { key: 'search', text: t('inboxAsk.contextBulletSearch') },
      { key: 'notes', text: t('inboxAsk.contextBulletNotes') },
      { key: 'prior', text: t('inboxAsk.contextBulletPrior') },
      { key: 'q', text: t('inboxAsk.contextBulletQuestion') },
    ];
    if (notesDropped > 0) {
      items.push({
        key: 'dropped',
        text: t('inboxAsk.contextBulletDropped', { count: notesDropped }),
      });
    }
    return items;
  }, [notesDropped, t]);

  const footerText = isPrivate
    ? t('inboxAsk.contextFooterPrivate')
    : t('inboxAsk.contextFooterCloud');

  const metaRow = (
    <TouchableOpacity
      onPress={openSheet}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${sourcesLine}. ${processingLine}. ${t('inboxAsk.contextLearnMoreA11y')}`}
      className="flex-row items-start gap-2 rounded-xl px-3 py-3"
      style={{
        backgroundColor: color.background.primary,
        borderWidth: 1,
        borderColor: color.border.default,
      }}
    >
      <View className="min-w-0 flex-1" style={{ gap: 8 }}>
        <Text
          className="text-[14px] font-medium leading-5"
          style={{ color: color.text.primary }}
          numberOfLines={3}
        >
          {sourcesLine}
        </Text>
        {notesDropped > 0 ? (
          <Text className="text-xs leading-5" style={{ color: color.text.secondary }}>
            {t('inboxAsk.contextDropped', { count: notesDropped })}
          </Text>
        ) : null}
        {noteTitles.length > 0 ? (
          <View className="gap-0.5">
            {noteTitles.slice(0, 4).map((title) => (
              <Text
                key={title}
                className="text-xs leading-5"
                style={{ color: color.text.secondary }}
                numberOfLines={1}
              >
                • {title}
              </Text>
            ))}
          </View>
        ) : null}
        <View
          className="self-start flex-row items-center"
          style={{
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: color.background.tertiary,
          }}
        >
          {isPrivate ? (
            <Shield size={14} color={color.text.secondary} strokeWidth={2} />
          ) : (
            <Cloud size={14} color={color.text.secondary} strokeWidth={2} />
          )}
          <Text style={{ fontSize: 12, color: color.text.secondary }}>{processingLine}</Text>
        </View>
      </View>
      <View style={{ alignSelf: 'center' }}>
        <ChevronRight size={18} color={color.icon.muted} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <View className="gap-2">{metaRow}</View>
      <BottomSheetModal ref={sheetRef} {...sheetChrome}>
        <BottomSheetView
          style={{
            paddingHorizontal: 20,
            ...contentPadding,
          }}
        >
          <Text
            className="text-[17px] font-semibold leading-6"
            style={{
              color: color.text.primary,
              fontSize: 20,
              fontWeight: '700',
              lineHeight: 28,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {t('inboxAsk.contextSheetTitle')}
          </Text>
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 18,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            {t('inboxAsk.contextSheetIntro')}
          </Text>
          <View className="gap-2">
            {sheetBullets.map((item) => (
              <View key={item.key} className="flex-row gap-2">
                <Text style={{ color: color.accent.primary, fontSize: 14, lineHeight: 22 }}>
                  {'\u2022'}
                </Text>
                <Text
                  className="flex-1 text-[14px] leading-[22px]"
                  style={{ color: color.text.primary }}
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
          {noteTitles.length > 0 ? (
            <View
              className="mt-3 gap-1 rounded-xl px-3 py-3"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
                {t('inboxAsk.contextSheetNotesHeading')}
              </Text>
              {noteTitles.map((title) => (
                <Text
                  key={title}
                  className="text-[13px] leading-5"
                  style={{ color: color.text.primary }}
                  numberOfLines={1}
                >
                  • {title}
                </Text>
              ))}
            </View>
          ) : null}
          <Text
            className="mt-3 text-[13px] leading-[19px]"
            style={{ color: color.text.secondary, marginBottom: 2 }}
          >
            {footerText}
          </Text>
          <SheetFooterButtons
            color={color}
            primaryLabel={t('common.gotIt')}
            onPrimaryPress={closeSheet}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
