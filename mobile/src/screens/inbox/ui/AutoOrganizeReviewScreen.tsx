import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { Check } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { InboxStackParamList } from '@/app/navigation/types';
import type { Folder } from '@/entities/folder';
import { FolderFormModal, useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { computeAdsAllowedForInterstitial } from '@/features/app-storefront';
import {
  type AssignmentDraft,
  AutoOrganizeDestinationPickerContent,
  AutoOrganizeReviewAssignmentsSection,
  AutoOrganizeReviewFoldersSection,
  type ReviewFolderItem,
  useAutoOrganizeReview,
} from '@/features/auto-organize-review';
import { AutoOrganizeProgressOverlay } from '@/features/manage-folders';
import { useProEntitlement } from '@/features/pro-license';
import {
  runAfterNavigationTransition,
  tryShowYandexInterstitial,
} from '@/features/yandex-interstitial';
import { useColors } from '@/shared/config';
import { DEFAULT_FOLDER_BRAND_HEX, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import {
  AppBottomSheetModal,
  HeaderIconButton,
  ScreenHeader,
  useBottomSheetContentPadding,
} from '@/shared/ui';

type AutoOrganizeReviewRouteProp = RouteProp<InboxStackParamList, 'AutoOrganizeReview'>;
type EditingFolderTarget = { kind: 'existing'; id: string } | { kind: 'proposed'; tempId: string };

const APPLY_SUCCESS_OVERLAY_MS = 1400;

export const AutoOrganizeReviewScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pickerContentPadding = useBottomSheetContentPadding(24);
  const navigation = useNavigation<NativeStackNavigationProp<InboxStackParamList>>();
  const route = useRoute<AutoOrganizeReviewRouteProp>();
  const color = useColors();
  const isTablet = useIsTablet();

  const result = route.params.result;

  const { isProActive } = useProEntitlement();
  const folders = useFolderStore((s) => s.folders);
  const createFolder = useFolderStore((s) => s.createFolder);
  const updateFolder = useFolderStore((s) => s.updateFolder);
  const setRecordFolder = useRecordStore((s) => s.setRecordFolder);
  const records = useRecordStore((s) => s.records);

  const recordTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of records) {
      m.set(r.id, r.title || t('record.autoTitle.morning'));
    }
    return m;
  }, [records, t]);

  const [editingFolderTarget, setEditingFolderTarget] = useState<EditingFolderTarget | null>(null);
  const [picker, setPicker] = useState<{ visible: boolean; recordId: string | null }>({
    visible: false,
    recordId: null,
  });
  const [applyOverlayVisible, setApplyOverlayVisible] = useState(false);
  const [applyOverlayMode, setApplyOverlayMode] = useState<'loading' | 'success'>('loading');

  const goBackOrInboxHome = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('InboxHome');
  }, [navigation]);

  const onAppliedAfterAutoOrganize = useCallback(() => {
    goBackOrInboxHome();
    runAfterNavigationTransition(() => {
      void tryShowYandexInterstitial({
        adsAllowed: computeAdsAllowedForInterstitial(isProActive),
        trigger: 'after_auto_organize',
      });
    });
  }, [goBackOrInboxHome, isProActive]);

  const {
    assignments,
    proposedFolders,
    setProposedFolders,
    visibleProposedFolders,
    reviewFolders,
    proposedFolderNoteCountByTempId,
    existingFolderNoteCountById,
    isApplying,
    apply,
    setAssignmentDestination,
  } = useAutoOrganizeReview({
    result,
    folders,
    isProActive,
    createFolder,
    setRecordFolder,
  });

  const confirmApply = useCallback(async () => {
    if (isApplying || applyOverlayVisible) return;

    setApplyOverlayVisible(true);
    setApplyOverlayMode('loading');

    const ok = await apply();
    if (!ok) {
      setApplyOverlayVisible(false);
      setApplyOverlayMode('loading');
      return;
    }

    setApplyOverlayMode('success');
    await new Promise<void>((resolve) => {
      setTimeout(resolve, APPLY_SUCCESS_OVERLAY_MS);
    });
    setApplyOverlayVisible(false);
    setApplyOverlayMode('loading');
    onAppliedAfterAutoOrganize();
  }, [apply, applyOverlayVisible, isApplying, onAppliedAfterAutoOrganize]);

  const openPicker = useCallback((recordId: string) => {
    setPicker({ visible: true, recordId });
  }, []);

  const closePicker = useCallback(() => {
    setPicker({ visible: false, recordId: null });
  }, []);

  const pickDestination = useCallback(
    (dest: AssignmentDraft['destination']) => {
      const rid = picker.recordId;
      if (!rid) return;
      setAssignmentDestination(rid, dest);
      closePicker();
    },
    [closePicker, picker.recordId, setAssignmentDestination],
  );

  const contentMaxWidth = useTabletContentMaxWidth('wide');
  const assignmentsSectionLabel = t('folders.autoOrganizeReviewAssignmentsSection', {
    defaultValue: t('folders.autoOrganizeReviewAssignmentsSection'),
  });
  const moveToLabel = useCallback(
    (folder: string) =>
      t('folders.autoOrganizeReviewMoveTo', {
        folder,
      }),
    [t],
  );
  const getRecordTitle = useCallback(
    (recordId: string) =>
      recordTitleById.get(recordId) ?? t('folders.autoOrganizeReviewUnknownNote'),
    [recordTitleById, t],
  );

  const destinationLabel = useCallback(
    (d: AssignmentDraft['destination']) => {
      if (d.kind === 'inbox') return t('folders.autoOrganizeReviewInbox');
      if (d.kind === 'existingFolder') {
        const f = folders.find((x) => x.id === d.folderId);
        return f?.name ?? t('folders.autoOrganizeReviewFolderRemoved');
      }
      const pf = proposedFolders.find((x) => x.tempId === d.tempId);
      return pf?.name ?? t('folders.autoOrganizeReviewUnknownFolder');
    },
    [folders, proposedFolders, t],
  );

  const selectedDestinationForPicker = useMemo(() => {
    if (!picker.recordId) return null;

    const assignment = assignments.find((a) => a.recordId === picker.recordId);

    return assignment?.destination ?? null;
  }, [assignments, picker.recordId]);

  const isDestinationSelected = useCallback(
    (candidate: AssignmentDraft['destination']) => {
      const selected = selectedDestinationForPicker;
      if (!selected) return false;
      if (selected.kind !== candidate.kind) return false;
      if (selected.kind === 'inbox' && candidate.kind === 'inbox') return true;

      if (selected.kind === 'existingFolder' && candidate.kind === 'existingFolder') {
        return selected.folderId === candidate.folderId;
      }

      if (selected.kind === 'proposedFolder' && candidate.kind === 'proposedFolder') {
        return selected.tempId === candidate.tempId;
      }

      return false;
    },
    [selectedDestinationForPicker],
  );

  const editingFolder = useMemo((): Folder | null => {
    if (!editingFolderTarget) return null;

    if (editingFolderTarget.kind === 'existing') {
      return folders.find((x) => x.id === editingFolderTarget.id) ?? null;
    }

    const f = proposedFolders.find((x) => x.tempId === editingFolderTarget.tempId);
    if (!f) return null;
    return {
      id: f.tempId,
      name: f.name,
      icon: f.icon,
      color: isProActive ? f.color || DEFAULT_FOLDER_BRAND_HEX : DEFAULT_FOLDER_BRAND_HEX,
      sortOrder: 0,
      createdAt: dayjs().toISOString(),
    };
  }, [editingFolderTarget, folders, isProActive, proposedFolders]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('folders.autoOrganizeReviewTitle')}
        onBack={() => {
          if (applyOverlayVisible) return;
          goBackOrInboxHome();
        }}
        titleAlign="center"
        rightSlot={
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            accessibilityLabel={t('folders.autoOrganizeApplyA11y')}
            accessibilityState={{ disabled: isApplying || applyOverlayVisible }}
            icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
            color={color}
            onPress={() => {
              void confirmApply();
            }}
            disabled={isApplying || applyOverlayVisible}
          />
        }
      />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 13, color: color.text.secondary, marginBottom: 8 }}>
            {t('folders.autoOrganizeReviewSubtitle')}
          </Text>
          <AutoOrganizeReviewFoldersSection
            color={color}
            isProActive={isProActive}
            reviewFolders={reviewFolders}
            proposedFolderNoteCountByTempId={proposedFolderNoteCountByTempId}
            existingFolderNoteCountById={existingFolderNoteCountById}
            onPressFolder={(item: ReviewFolderItem) => {
              if (item.kind === 'proposed') {
                setEditingFolderTarget({ kind: 'proposed', tempId: item.folder.tempId });
                return;
              }
              setEditingFolderTarget({ kind: 'existing', id: item.folder.id });
            }}
            noFoldersLabel={t('folders.autoOrganizeReviewNoFolders')}
            unnamedFolderLabel={t('folders.autoOrganizeReviewUnnamedFolder')}
            folderSectionLabel={t('folders.autoOrganizeReviewFoldersSection')}
            getFolderNoteCountLabel={(count) =>
              t('folders.autoOrganizeReviewFolderNoteCount', {
                count,
              })
            }
          />
          <AutoOrganizeReviewAssignmentsSection
            color={color}
            assignments={assignments}
            onOpenPicker={openPicker}
            getRecordTitle={getRecordTitle}
            getDestinationLabel={destinationLabel}
            assignmentsSectionLabel={assignmentsSectionLabel}
            unknownNoteLabel={t('folders.autoOrganizeReviewUnknownNote')}
            noAssignmentsLabel={t('folders.autoOrganizeReviewNoAssignments')}
            getMoveToLabel={moveToLabel}
          />
        </ScrollView>
      </View>
      <AppBottomSheetModal visible={picker.visible} onClose={closePicker}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            ...pickerContentPadding,
          }}
        >
          <AutoOrganizeDestinationPickerContent
            color={color}
            isProActive={isProActive}
            folders={folders}
            visibleProposedFolders={visibleProposedFolders}
            onPickDestination={pickDestination}
            isDestinationSelected={isDestinationSelected}
            onClose={closePicker}
            pickFolderTitle={t('folders.autoOrganizeReviewPickFolderTitle')}
            inboxLabel={t('folders.autoOrganizeReviewInbox')}
            unnamedFolderLabel={t('folders.autoOrganizeReviewUnnamedFolder')}
            cancelLabel={t('common.cancel')}
          />
        </BottomSheetScrollView>
      </AppBottomSheetModal>
      <AutoOrganizeProgressOverlay
        visible={applyOverlayVisible}
        mode={applyOverlayMode}
        variant="apply"
      />
      <FolderFormModal
        visible={Boolean(editingFolderTarget)}
        folder={editingFolder}
        onClose={() => setEditingFolderTarget(null)}
        onSave={async (name, folderColor, icon) => {
          if (!editingFolderTarget) return;

          if (editingFolderTarget.kind === 'existing') {
            await updateFolder(editingFolderTarget.id, {
              name,
              color: folderColor,
              icon,
            });
            setEditingFolderTarget(null);
            return;
          }

          setProposedFolders((prev) =>
            prev.map((x) =>
              x.tempId === editingFolderTarget.tempId
                ? { ...x, name, color: folderColor, icon }
                : x,
            ),
          );
          setEditingFolderTarget(null);
        }}
      />
    </View>
  );
};
