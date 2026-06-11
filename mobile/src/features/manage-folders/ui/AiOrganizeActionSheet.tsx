import { Archive, FolderInput, FolderSync, FolderTree } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUTO_ORGANIZE_MODES,
  type AutoOrganizeMode,
  isProAutoOrganizeMode,
} from '@/entities/folder/lib/autoOrganizeTypes';
import { type Colors, useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib/haptics';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  ProCrownBadge,
  SheetActionOptionRow,
  SheetFooterButtons,
  SheetHeader,
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
      <AppBottomSheetContent
        style={{ flexGrow: 0 }}
        bottomPadding={AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING}
      >
        <SheetHeader
          title={t('folders.aiOrganizeSheet.title')}
          subtitle={subtitle}
          color={color}
          marginBottom={10}
        />

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
              <SheetActionOptionRow
                key={action.mode}
                label={action.label}
                hint={action.hint}
                icon={action.icon}
                trailing={locked ? <ProCrownBadge /> : undefined}
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
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
