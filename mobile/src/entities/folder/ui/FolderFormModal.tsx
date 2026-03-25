import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Crown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/entities/settings/model/store';
import { useProEntitlement } from '@/features/pro-license';
import { AutomationComingSoonSheet } from '@/screens/settings/ui/AutomationComingSoonSheet';
import {
  type AccentColorId,
  getAccentColorSwatchesCurrentFirst,
  getAccentPreviewHex,
  useAppTheme,
  useColors,
} from '@/shared/config';
import {
  DEFAULT_FOLDER_BRAND_HEX,
  hapticError,
  resolveFolderColorForCurrentScheme,
} from '@/shared/lib';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

import {
  DEFAULT_FOLDER_ICON_KEY,
  FOLDER_ICON_KEYS,
  folderIconComponents,
  type FolderIconKey,
  parseFolderIconKey,
} from '../lib/folderLucideIcons';
import type { Folder } from '../model/types';

const ACCENT_SWATCH_SIZE = 44;
const ACCENT_SWATCH_RING = 3;
const ACCENT_SWATCH_FILL = 36;
const ACCENT_SWATCH_FILL_SELECTED = ACCENT_SWATCH_SIZE - 2 * ACCENT_SWATCH_RING - 4;
const ACCENT_SWATCH_PAD_UNSELECTED = (ACCENT_SWATCH_SIZE - ACCENT_SWATCH_FILL) / 2;

const hexEquals = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const getPreviewHexByAccentId = (id: AccentColorId, scheme: 'light' | 'dark') =>
  getAccentPreviewHex(id, scheme) ?? DEFAULT_FOLDER_BRAND_HEX;

const SECTION_LABEL_STYLE = {
  fontSize: 12,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  marginBottom: 10,
};

type FolderFormModalProps = {
  visible: boolean;
  folder?: Folder | null;
  onSave: (name: string, folderColor: string, icon: string) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export const FolderFormModal = ({
  visible,
  folder,
  onSave,
  onDelete,
  onClose,
}: FolderFormModalProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const scheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ref = useRef<BottomSheetModal>(null);
  const { isProActive } = useProEntitlement();
  const accentColorId = useSettingsStore((state) => state.accentColorId);
  const globalAccentHex = getPreviewHexByAccentId(accentColorId, scheme);
  const colorSwatches = getAccentColorSwatchesCurrentFirst(accentColorId, scheme);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [selectedColor, setSelectedColor] = useState(globalAccentHex);
  const [selectedIcon, setSelectedIcon] = useState<FolderIconKey>(DEFAULT_FOLDER_ICON_KEY);
  const [folderProSheet, setFolderProSheet] = useState(false);

  useEffect(() => {
    setNameError(false);
    if (folder) {
      setName(folder.name);
      setSelectedColor(resolveFolderColorForCurrentScheme(folder.color, scheme));
      setSelectedIcon(parseFolderIconKey(folder.icon));
    } else {
      setName('');
      setSelectedColor(globalAccentHex);
      setSelectedIcon(DEFAULT_FOLDER_ICON_KEY);
    }
  }, [folder, visible, globalAccentHex, scheme]);

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }
    ref.current?.dismiss();
    return undefined;
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      requestAnimationFrame(() => {
        ref.current?.collapse();
      });
    });
    return () => sub.remove();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      hapticError();
      return;
    }
    setNameError(false);
    const colorToSave = isProActive
      ? selectedColor
      : !folder
        ? DEFAULT_FOLDER_BRAND_HEX
        : hexEquals(selectedColor, DEFAULT_FOLDER_BRAND_HEX)
          ? DEFAULT_FOLDER_BRAND_HEX
          : folder.color;
    onSave(trimmed, colorToSave, selectedIcon);
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (nameError) setNameError(false);
  };

  const handleFolderColorSelect = useCallback(
    (id: AccentColorId, previewHex: string) => {
      if (id === 'default') {
        setSelectedColor(previewHex);
        return;
      }
      if (!isProActive) {
        setFolderProSheet(true);
        return;
      }
      setSelectedColor(previewHex);
    },
    [isProActive],
  );

  const handleDelete = () => {
    Alert.alert(t('folders.deleteTitle'), t('folders.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: onDelete },
    ]);
  };

  const isEditing = Boolean(folder);
  const SelectedIconComponent = folderIconComponents[selectedIcon];

  const H_PAD = 20;
  const PHONE_ICON_COLS = 6;
  const ICON_GAP = 10;
  const availableIconGridWidth = width - H_PAD * 2;
  const isTablet = width >= 768;
  const iconCols = isTablet ? FOLDER_ICON_KEYS.length : PHONE_ICON_COLS;
  const calculatedIconSize = Math.floor(
    (availableIconGridWidth - ICON_GAP * (iconCols - 1)) / iconCols,
  );
  const iconSize = isTablet ? Math.min(calculatedIconSize, 64) : calculatedIconSize;
  const iconGridWidth = iconSize * iconCols + ICON_GAP * (iconCols - 1);

  const iconRows: FolderIconKey[][] = [];
  for (let i = 0; i < FOLDER_ICON_KEYS.length; i += iconCols) {
    iconRows.push(FOLDER_ICON_KEYS.slice(i, i + iconCols));
  }

  return (
    <>
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        enablePanDownToClose
        enableOverDrag={false}
        keyboardBehavior={modalKeyboardBehavior}
        keyboardBlurBehavior="restore"
        enableBlurKeyboardOnGesture
        backdropComponent={renderBackdrop}
        onDismiss={onClose}
        backgroundStyle={{
          backgroundColor: color.background.primary,
          borderTopWidth: 1,
          borderTopColor: color.border.default,
        }}
        handleIndicatorStyle={{
          width: 36,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: color.icon.muted,
        }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={false}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: color.text.primary,
              textAlign: 'center',
              paddingTop: 4,
              marginBottom: 20,
            }}
          >
            {isEditing ? t('folders.edit') : t('folders.create')}
          </Text>
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: color.background.tertiary,
                borderRadius: 12,
                paddingHorizontal: 14,
                gap: 10,
                borderWidth: nameError ? 2 : 0,
                borderColor: nameError ? color.accent.delete : 'transparent',
              }}
            >
              <SelectedIconComponent size={20} color={selectedColor} strokeWidth={2} />
              <BottomSheetTextInput
                value={name}
                onChangeText={handleNameChange}
                placeholder={t('folders.namePlaceholder')}
                placeholderTextColor={color.text.muted}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: color.text.primary,
                  paddingVertical: 12,
                }}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
            {nameError ? (
              <Text
                style={{
                  marginTop: 8,
                  marginLeft: 4,
                  fontSize: 13,
                  color: color.accent.delete,
                }}
                accessibilityLiveRegion="polite"
              >
                {t('folders.nameRequired')}
              </Text>
            ) : null}
          </View>

          {/* Icon picker */}
          <Text style={[SECTION_LABEL_STYLE, { color: color.text.secondary }]}>
            {t('folders.iconLabel')}
          </Text>
          <View
            style={{ gap: ICON_GAP, marginBottom: 24, width: iconGridWidth, alignSelf: 'center' }}
          >
            {iconRows.map((row, rowIdx) => (
              <View
                key={rowIdx}
                style={{
                  flexDirection: 'row',
                  gap: ICON_GAP,
                }}
              >
                {row.map((key) => {
                  const IconComp = folderIconComponents[key];
                  const isActive = selectedIcon === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setSelectedIcon(key)}
                      activeOpacity={0.7}
                      style={{
                        width: iconSize,
                        height: iconSize,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isActive ? selectedColor : color.background.tertiary,
                      }}
                    >
                      <IconComp
                        size={Math.floor(iconSize * 0.42)}
                        strokeWidth={1.75}
                        color={isActive ? color.icon.onAccent : color.text.secondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Text style={[SECTION_LABEL_STYLE, { color: color.text.secondary, marginBottom: 0 }]}>
              {t('folders.colorLabel')}
            </Text>
            {!isProActive && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Crown size={14} color={color.accent.primary} strokeWidth={2} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: color.accent.primary }}>
                  {t('common.pro')}
                </Text>
              </View>
            )}
          </View>
          {isProActive && (
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                color: color.text.muted,
                marginBottom: 10,
                marginTop: -4,
              }}
            >
              {t('folders.colorHint')}
            </Text>
          )}
          <View
            className="overflow-hidden rounded-2xl"
            style={{
              borderWidth: 1,
              borderColor: color.border.default,
              marginBottom: isProActive ? 28 : 0,
            }}
          >
            <View
              className="flex-row flex-wrap px-4 py-4"
              style={{
                backgroundColor: color.background.secondary,
                gap: 12,
              }}
            >
              {colorSwatches.map(({ id, previewHex }) => {
                const selected = hexEquals(selectedColor, previewHex);
                const fillSize = selected ? ACCENT_SWATCH_FILL_SELECTED : ACCENT_SWATCH_FILL;
                const locked = !isProActive && id !== 'default';
                return (
                  <TouchableOpacity
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={t(`appearance.accentColor.option.${id}`)}
                    accessibilityHint={
                      locked ? t('appearance.accentColor.a11yLockedHint') : undefined
                    }
                    accessibilityState={{ selected }}
                    onPress={() => handleFolderColorSelect(id, previewHex)}
                    activeOpacity={0.75}
                    style={{
                      width: ACCENT_SWATCH_SIZE,
                      height: ACCENT_SWATCH_SIZE,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: ACCENT_SWATCH_SIZE,
                        height: ACCENT_SWATCH_SIZE,
                        borderRadius: ACCENT_SWATCH_SIZE / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: selected ? ACCENT_SWATCH_RING : 0,
                        borderColor: selected ? previewHex : 'transparent',
                        padding: selected ? 0 : ACCENT_SWATCH_PAD_UNSELECTED,
                      }}
                    >
                      <View
                        style={{
                          width: fillSize,
                          height: fillSize,
                          borderRadius: fillSize / 2,
                          backgroundColor: previewHex,
                          borderWidth: 1,
                          borderColor: color.border.default,
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {!isProActive ? (
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                color: color.text.muted,
                marginTop: 8,
                marginBottom: 28,
              }}
            >
              {t('appearance.accentColor.subtitle')}
            </Text>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            label={t('common.save')}
            onPress={handleSave}
            color={color}
            accessibilityLabel={t('common.save')}
          />
          {isEditing && onDelete && (
            <View style={{ marginTop: 10 }}>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                label={t('folders.delete')}
                onPress={handleDelete}
                color={color}
                accessibilityLabel={t('folders.delete')}
              />
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
      <AutomationComingSoonSheet
        visible={folderProSheet}
        feature="folderColor"
        onClose={() => setFolderProSheet(false)}
      />
    </>
  );
};
