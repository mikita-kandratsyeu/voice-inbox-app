import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Check, GitBranch } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import {
  AppBottomSheetModal,
  getInputFieldInputStyle,
  SheetFooterButtons,
  useBottomSheetContentPadding,
} from '@/shared/ui';

import { GITHUB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import type { GithubBranchSummary } from '../lib/githubApi';
import { isValidGithubSyncBranchName } from '../lib/githubSyncBranch';

const BRANCH_ROW_HEIGHT = 56;
const BRANCH_LIST_MAX_HEIGHT = 280;

type Props = {
  visible: boolean;
  color: Colors;
  branch: string;
  branches: GithubBranchSummary[];
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onLoadBranches: () => void | Promise<void>;
  onSelect: (branch: string) => void | Promise<void>;
  onSave: (branch: string) => void | Promise<void>;
};

type BranchPickerRowProps = {
  item: GithubBranchSummary;
  color: Colors;
  isLast: boolean;
  isSelected: boolean;
  onPress: () => void;
};

function BranchPickerRow({ item, color, isLast, isSelected, onPress }: BranchPickerRowProps) {
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={item.name}
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
        <Text
          style={{
            color: color.text.primary,
            flex: 1,
            fontSize: 16,
            fontWeight: isSelected ? '600' : '500',
            lineHeight: 21,
          }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {isSelected ? <Check size={20} color={color.accent.primary} strokeWidth={2.5} /> : null}
      </View>
    </Pressable>
  );
}

export function GithubSyncBranchSheet({
  visible,
  color,
  branch,
  branches,
  loading,
  saving,
  onClose,
  onLoadBranches,
  onSelect,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(12);
  const onLoadBranchesRef = useRef(onLoadBranches);
  const [draft, setDraft] = useState(branch);
  onLoadBranchesRef.current = onLoadBranches;

  useEffect(() => {
    if (visible) {
      setDraft(branch);
      void onLoadBranchesRef.current();
    }
  }, [branch, visible]);

  const trimmed = draft.trim();
  const canSave =
    trimmed.length > 0 &&
    isValidGithubSyncBranchName(trimmed) &&
    trimmed !== branch &&
    !saving;

  const listHeight = useMemo(
    () => Math.min(branches.length * BRANCH_ROW_HEIGHT, BRANCH_LIST_MAX_HEIGHT),
    [branches.length],
  );

  const handleSelect = useCallback(
    (name: string) => {
      if (saving || name === branch) {
        return;
      }
      void onSelect(name);
    },
    [branch, onSelect, saving],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: GithubBranchSummary; index: number }) => (
      <BranchPickerRow
        item={item}
        color={color}
        isLast={index === branches.length - 1}
        isSelected={item.name === branch}
        onPress={() => handleSelect(item.name)}
      />
    ),
    [branch, branches.length, color, handleSelect],
  );

  const keyExtractor = useCallback((item: GithubBranchSummary) => item.name, []);

  const listBody = loading ? (
    <View className="items-center py-10">
      <ActivityIndicator color={color.accent.primary} />
    </View>
  ) : branches.length === 0 ? (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 20,
        textAlign: 'center',
      }}
    >
      {t('settings.githubSync.branchesEmpty')}
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 4, ...contentPadding }}>
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
          {t('settings.githubSync.branchSheetTitle')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {t('settings.githubSync.branchSheetSubtitle')}
        </Text>

        <Text
          style={{
            color: color.text.secondary,
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 0.6,
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          {t('settings.githubSync.branchListTitle')}
        </Text>

        {listBody}

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
          {t('settings.githubSync.branchCustomTitle')}
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
            placeholder={GITHUB_SYNC_DEFAULT_BRANCH}
            placeholderTextColor={color.text.muted}
            accessibilityLabel={t('settings.githubSync.branchFieldA11y')}
            style={getInputFieldInputStyle(color)}
          />
        </View>
        <Text style={{ color: color.text.muted, fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
          {t('settings.githubSync.branchWhyHint')}
        </Text>

        <SheetFooterButtons
          color={color}
          className="mt-2 w-full"
          primaryLabel={t('common.save')}
          onPrimaryPress={() => void onSave(trimmed)}
          primaryDisabled={!canSave}
          primaryLoading={saving}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={onClose}
          secondaryDisabled={saving}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
