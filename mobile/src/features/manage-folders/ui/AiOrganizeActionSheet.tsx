import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Archive, FolderInput, FolderSync, FolderTree } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUTO_ORGANIZE_MODES,
  type AutoOrganizeMode,
  isProAutoOrganizeMode,
} from '@/entities/folder/lib/autoOrganizeTypes';
import { type Colors, useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib/haptics';
import {
  AppBottomSheetModal,
  ProCrownBadge,
  SheetFooterButtons,
  useBottomSheetContentPadding,
} from '@/shared/ui';

import {
  AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
  getAiOrganizeActionSheetSnapHeight,
} from '../lib/aiOrganizeSheetLayout';

type AiOrganizeActionSheetProps = {
  visible: boolean;
  presentRequestKey?: number;
  eligibleCount: number;
  isProActive: boolean;
  onClose: () => void;
  onSelect: (mode: AutoOrganizeMode) => void;
  onProRequired: () => void;
};

const ICON_SIZE = 18;

type SheetOptionRowProps = {
  label: string;
  hint: string;
  icon: React.ReactNode;
  showProBadge: boolean;
  onPress: () => void;
  isLast?: boolean;
};

function SheetOptionRow({
  label,
  hint,
  icon,
  showProBadge,
  onPress,
  isLast = false,
}: SheetOptionRowProps) {
  const color = useColors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: color.border.default,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {icon}
      <View
        style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
      >
        <Text style={{ fontSize: 16, color: color.text.primary, flexShrink: 1 }} numberOfLines={2}>
          {label}
        </Text>
        {showProBadge ? <ProCrownBadge /> : null}
      </View>
    </TouchableOpacity>
  );
}

function ActionIconBadge({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${tint}1a`,
      }}
    >
      {children}
    </View>
  );
}

function buildActionRows(
  color: Colors,
  t: (key: string) => string,
): Array<{
  mode: AutoOrganizeMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
}> {
  return [
    {
      mode: 'full',
      label: t('folders.aiOrganizeSheet.actions.full'),
      hint: t('folders.aiOrganizeSheet.actions.fullHint'),
      icon: (
        <ActionIconBadge tint={color.accent.primary}>
          <FolderTree size={ICON_SIZE} color={color.accent.primary} strokeWidth={2.1} />
        </ActionIconBadge>
      ),
    },
    {
      mode: 'assign_existing',
      label: t('folders.aiOrganizeSheet.actions.assignExisting'),
      hint: t('folders.aiOrganizeSheet.actions.assignExistingHint'),
      icon: (
        <ActionIconBadge tint={color.accent.models}>
          <FolderInput size={ICON_SIZE} color={color.accent.models} strokeWidth={2.1} />
        </ActionIconBadge>
      ),
    },
    {
      mode: 'consolidate_folders',
      label: t('folders.aiOrganizeSheet.actions.consolidate'),
      hint: t('folders.aiOrganizeSheet.actions.consolidateHint'),
      icon: (
        <ActionIconBadge tint={color.accent.cache}>
          <FolderSync size={ICON_SIZE} color={color.accent.cache} strokeWidth={2.1} />
        </ActionIconBadge>
      ),
    },
    {
      mode: 'suggest_archive',
      label: t('folders.aiOrganizeSheet.actions.suggestArchive'),
      hint: t('folders.aiOrganizeSheet.actions.suggestArchiveHint'),
      icon: (
        <ActionIconBadge tint={color.accent.archive}>
          <Archive size={ICON_SIZE} color={color.accent.archive} strokeWidth={2.1} />
        </ActionIconBadge>
      ),
    },
  ];
}

export function AiOrganizeActionSheet({
  visible,
  presentRequestKey = 0,
  eligibleCount,
  isProActive,
  onClose,
  onSelect,
  onProRequired,
}: AiOrganizeActionSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const contentPadding = useBottomSheetContentPadding(AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING);

  const actions = useMemo(() => buildActionRows(color, t), [color, t]);
  const snapPoints = useMemo(
    () => [getAiOrganizeActionSheetSnapHeight(insets.bottom, AUTO_ORGANIZE_MODES.length)],
    [insets.bottom],
  );

  const subtitle = t('folders.aiOrganizeSheet.subtitle', {
    count: eligibleCount,
  });

  return (
    <AppBottomSheetModal
      visible={visible}
      presentRequestKey={presentRequestKey}
      onClose={onClose}
      snapPoints={snapPoints}
      enableContentPanningGesture={false}
    >
      <BottomSheetView style={{ flexGrow: 0, paddingHorizontal: 20, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 4,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('folders.aiOrganizeSheet.title')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 10,
            textAlign: 'center',
            paddingHorizontal: 4,
          }}
        >
          {subtitle}
        </Text>

        <View
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.card,
          }}
        >
          {actions.map((action, index) => {
            const locked = isProAutoOrganizeMode(action.mode) && !isProActive;

            return (
              <SheetOptionRow
                key={action.mode}
                label={action.label}
                hint={action.hint}
                icon={action.icon}
                showProBadge={locked}
                isLast={index === actions.length - 1}
                onPress={() => {
                  hapticSelection();
                  if (locked) {
                    onProRequired();
                    return;
                  }
                  onSelect(action.mode);
                }}
              />
            );
          })}
        </View>

        <SheetFooterButtons
          className="mt-3 w-full"
          color={color}
          primaryLabel={t('common.cancel')}
          onPrimaryPress={onClose}
          singleVariant="secondary"
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
