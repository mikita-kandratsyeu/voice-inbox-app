import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Check, GitBranch, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Keyboard, Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  getInputFieldInputStyle,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { GITLAB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import type { GitlabBranchSummary } from '../lib/gitlabApi';
import { isValidGitlabSyncBranchName } from '../lib/gitlabSyncBranch';

const BRANCH_ROW_HEIGHT = 64;
const BRANCH_LIST_MAX_HEIGHT = 420;

type DeleteBranchResult =
  | { ok: true }
  | { ok: false; code: 'active_branch' | 'default_branch' | 'unauthorized' | 'failed' | string };

type Props = {
  visible: boolean;
  color: Colors;
  branch: string;
  defaultBranch: string | null;
  branches: GitlabBranchSummary[];
  loading: boolean;
  saving: boolean;
  deletingBranch: string | null;
  onClose: () => void;
  onLoadBranches: () => void | Promise<void>;
  onSelect: (branch: string) => void | Promise<void>;
  onSave: (branch: string) => void | Promise<void>;
  onDelete: (branch: string) => Promise<DeleteBranchResult>;
};

type BranchPickerRowProps = {
  item: GitlabBranchSummary;
  color: Colors;
  defaultBranch: string | null;
  isLast: boolean;
  isSelected: boolean;
  canDelete: boolean;
  deleting: boolean;
  onPress: () => void;
  onDelete: () => void;
};

const trailingSlotStyle = {
  alignItems: 'center' as const,
  flexShrink: 0,
  height: 36,
  justifyContent: 'center' as const,
  width: 36,
};

function trailingButtonStyle(color: Colors, pressed = false, faded = false) {
  return {
    ...trailingSlotStyle,
    backgroundColor: color.background.tertiary,
    borderRadius: 10,
    opacity: pressed || faded ? 0.6 : 1,
  };
}

function BranchPickerRow({
  item,
  color,
  defaultBranch,
  isLast,
  isSelected,
  canDelete,
  deleting,
  onPress,
  onDelete,
}: BranchPickerRowProps) {
  const { t } = useTranslation();

  const subtitle = isSelected
    ? t('settings.gitlabSync.branchListActive')
    : defaultBranch != null && item.name === defaultBranch
      ? t('settings.gitlabSync.branchListDefault')
      : null;

  const trailing = isSelected ? (
    <View style={{ ...trailingSlotStyle, alignItems: 'flex-end' as const }}>
      <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
    </View>
  ) : canDelete ? (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        hapticSelection();
        onDelete();
      }}
      disabled={deleting}
      accessibilityRole="button"
      accessibilityLabel={t('settings.gitlabSync.branchDeleteA11y', { branch: item.name })}
      hitSlop={4}
      style={({ pressed }) => trailingButtonStyle(color, pressed, deleting)}
    >
      {deleting ? (
        <ActivityIndicator size="small" color={color.accent.delete} />
      ) : (
        <Trash2 size={18} color={color.accent.delete} strokeWidth={2} />
      )}
    </Pressable>
  ) : null;

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={subtitle ? `${item.name}, ${subtitle}` : item.name}
      style={({ pressed }) => ({
        backgroundColor: pressed ? color.background.tertiary : 'transparent',
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      })}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: 52,
          paddingHorizontal: 14,
          paddingVertical: 12,
          width: '100%',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: color.background.tertiary,
            borderRadius: 10,
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          <GitBranch size={18} color={color.accent.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'center', minWidth: 0 }}>
          <Text
            style={{ color: color.text.primary, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: color.text.secondary,
                fontSize: 12,
                lineHeight: 18,
                marginTop: 3,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing}
      </View>
    </Pressable>
  );
}

export function GitlabSyncBranchSheet({
  visible,
  color,
  branch,
  defaultBranch,
  branches,
  loading,
  saving,
  deletingBranch,
  onClose,
  onLoadBranches,
  onSelect,
  onSave,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const onLoadBranchesRef = useRef(onLoadBranches);
  const onDeleteRef = useRef(onDelete);
  const didLoadBranchesForOpenRef = useRef(false);
  const modalRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState(branch);
  onLoadBranchesRef.current = onLoadBranches;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    if (!visible) {
      didLoadBranchesForOpenRef.current = false;
      return;
    }
    if (!didLoadBranchesForOpenRef.current) {
      didLoadBranchesForOpenRef.current = true;
      void onLoadBranchesRef.current();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setDraft(branch);
    }
  }, [branch, visible]);

  const handleClosePress = useCallback(() => {
    Keyboard.dismiss();
    setDraft(branch);
    modalRef.current?.dismiss();
    onClose();
  }, [branch, onClose]);

  const trimmed = draft.trim();
  const canSave =
    trimmed.length > 0 &&
    isValidGitlabSyncBranchName(trimmed) &&
    trimmed !== branch &&
    !saving &&
    deletingBranch == null;

  const listHeight = useMemo(
    () => Math.min(branches.length * BRANCH_ROW_HEIGHT, BRANCH_LIST_MAX_HEIGHT),
    [branches.length],
  );

  const handleSelect = useCallback(
    (name: string) => {
      if (saving || deletingBranch != null || name === branch) {
        return;
      }
      void onSelect(name);
    },
    [branch, deletingBranch, onSelect, saving],
  );

  const handleDeletePress = useCallback(
    (name: string) => {
      if (saving || deletingBranch != null) {
        return;
      }
      Alert.alert(
        t('settings.gitlabSync.branchDeleteTitle'),
        t('settings.gitlabSync.branchDeleteMessage', { branch: name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const result = await onDeleteRef.current(name);
                if (result.ok) {
                  if (draft === name) {
                    setDraft(branch);
                  }
                  return;
                }
                if (result.code === 'active_branch') {
                  Alert.alert(t('common.error'), t('settings.gitlabSync.branchDeleteActive'));
                  return;
                }
                if (result.code === 'default_branch') {
                  Alert.alert(t('common.error'), t('settings.gitlabSync.branchDeleteDefault'));
                  return;
                }
                if (result.code === 'unauthorized') {
                  return;
                }
                Alert.alert(t('common.error'), t('settings.gitlabSync.branchDeleteFailed'));
              })();
            },
          },
        ],
      );
    },
    [branch, deletingBranch, draft, saving, t],
  );

  const canDeleteBranch = useCallback(
    (name: string) => {
      if (name === branch) {
        return false;
      }
      if (defaultBranch != null && name === defaultBranch) {
        return false;
      }
      return true;
    },
    [branch, defaultBranch],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: GitlabBranchSummary; index: number }) => (
      <BranchPickerRow
        item={item}
        color={color}
        defaultBranch={defaultBranch}
        isLast={index === branches.length - 1}
        isSelected={item.name === branch}
        canDelete={canDeleteBranch(item.name)}
        deleting={deletingBranch === item.name}
        onPress={() => handleSelect(item.name)}
        onDelete={() => handleDeletePress(item.name)}
      />
    ),
    [
      branch,
      canDeleteBranch,
      color,
      defaultBranch,
      deletingBranch,
      branches.length,
      handleDeletePress,
      handleSelect,
    ],
  );

  const keyExtractor = useCallback((item: GitlabBranchSummary) => item.name, []);

  const branchListBody = loading ? (
    <View className="items-center py-10">
      <ActivityIndicator color={color.accent.primary} />
    </View>
  ) : branches.length === 0 ? (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 24,
        textAlign: 'center',
      }}
    >
      {t('settings.gitlabSync.branchesEmpty')}
    </Text>
  ) : (
    <View
      style={{
        backgroundColor: color.background.card,
        borderColor: color.border.default,
        borderRadius: 12,
        borderWidth: 1,
        height: listHeight,
        overflow: 'hidden',
      }}
    >
      <FlashList
        data={branches}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={{
          branch,
          deletingBranch,
          branchNames: branches.map((item) => item.name).join('\0'),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <AppBottomSheetModal ref={modalRef} visible={visible} onClose={onClose}>
      <AppBottomSheetContent bottomPadding={12} style={{ paddingTop: 4 }}>
        <SheetHeader
          title={t('settings.gitlabSync.branchSheetTitle')}
          subtitle={t('settings.gitlabSync.branchSheetSubtitle')}
          color={color}
          marginBottom={10}
        />

        {branchListBody}

        <Text
          style={{
            color: color.text.secondary,
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 0.6,
            marginBottom: 8,
            marginTop: 16,
            textTransform: 'uppercase',
          }}
        >
          {t('settings.gitlabSync.branchCustomTitle')}
        </Text>
        <View
          style={{
            backgroundColor: color.background.card,
            borderColor: color.border.default,
            borderRadius: 12,
            borderWidth: 1,
            marginBottom: 8,
            overflow: 'hidden',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <BottomSheetTextInput
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={GITLAB_SYNC_DEFAULT_BRANCH}
            placeholderTextColor={color.text.muted}
            accessibilityLabel={t('settings.gitlabSync.branchFieldA11y')}
            style={getInputFieldInputStyle(color)}
            editable={!saving && deletingBranch == null}
          />
        </View>
        <Text style={{ color: color.text.muted, fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
          {t('settings.gitlabSync.branchWhyHint')}
        </Text>

        <SheetFooterButtons
          color={color}
          className="mt-2 w-full"
          primaryLabel={t('common.save')}
          onPrimaryPress={() => void onSave(trimmed)}
          primaryDisabled={!canSave}
          primaryLoading={saving}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={handleClosePress}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
