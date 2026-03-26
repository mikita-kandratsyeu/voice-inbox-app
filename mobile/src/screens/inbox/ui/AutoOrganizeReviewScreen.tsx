import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { InboxStackParamList } from '@/app/navigation/types';
import type { Folder } from '@/entities/folder';
import { FolderFormModal, useFolderStore } from '@/entities/folder';
import { folderIconComponents, parseFolderIconKey } from '@/entities/folder/lib/folderLucideIcons';
import { useRecordStore } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import { useColors } from '@/shared/config';
import { DEFAULT_FOLDER_BRAND_HEX, useTabletContentMaxWidth } from '@/shared/lib';
import { Button, ScreenHeader, SectionHeader } from '@/shared/ui';

type AutoOrganizeReviewRouteProp = RouteProp<InboxStackParamList, 'AutoOrganizeReview'>;

type ProposedFolderDraft = {
  tempId: string;
  name: string;
  icon: string;
  color: string;
};

type AssignmentDraft = {
  recordId: string;
  destination:
    | { kind: 'inbox' }
    | { kind: 'existingFolder'; folderId: string }
    | { kind: 'proposedFolder'; tempId: string };
};

export const AutoOrganizeReviewScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<AutoOrganizeReviewRouteProp>();
  const color = useColors();

  const result = route.params.result;

  const { isProActive } = useProEntitlement();
  const folders = useFolderStore((s) => s.folders);
  const createFolder = useFolderStore((s) => s.createFolder);
  const setRecordFolder = useRecordStore((s) => s.setRecordFolder);
  const records = useRecordStore((s) => s.records);

  const recordTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of records) {
      m.set(r.id, r.title || t('record.autoTitle.morning'));
    }
    return m;
  }, [records, t]);

  const [proposedFolders, setProposedFolders] = useState<ProposedFolderDraft[]>(() => {
    return result.folders.map((f, idx) => ({
      tempId: `p-${idx}-${f.name.trim().toLowerCase() || 'folder'}`,
      name: f.name.trim(),
      icon: f.icon,
      color: f.color,
    }));
  });

  const [editingTempId, setEditingTempId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<AssignmentDraft[]>(() => {
    const tempIdByLower = new Map<string, string>();
    for (const f of result.folders) {
      const key = f.name.trim().toLowerCase();
      if (!key) continue;
      const tempId = `p-${tempIdByLower.size}-${key}`;
      tempIdByLower.set(key, tempId);
    }

    return result.assignments.map((a) => {
      const key = a.folderName.trim().toLowerCase();
      const tempId = tempIdByLower.get(key);
      return {
        recordId: a.recordId,
        destination: tempId ? { kind: 'proposedFolder', tempId } : { kind: 'inbox' },
      };
    });
  });

  const [picker, setPicker] = useState<{ visible: boolean; recordId: string | null }>({
    visible: false,
    recordId: null,
  });
  const pickerRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (picker.visible) {
      requestAnimationFrame(() => pickerRef.current?.present());
    } else {
      pickerRef.current?.dismiss();
    }
  }, [picker.visible]);

  const proposedFolderNoteCountByTempId = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      if (a.destination.kind !== 'proposedFolder') continue;
      m.set(a.destination.tempId, (m.get(a.destination.tempId) ?? 0) + 1);
    }
    return m;
  }, [assignments]);

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
      setAssignments((prev) =>
        prev.map((a) => (a.recordId === rid ? { ...a, destination: dest } : a)),
      );
      closePicker();
    },
    [closePicker, picker.recordId],
  );

  const apply = useCallback(async () => {
    const existingById = new Map(folders.map((f) => [f.id, f]));
    const existingNameToId = new Map<string, string>();
    for (const f of folders) {
      const key = f.name.trim().toLowerCase();
      if (key) existingNameToId.set(key, f.id);
    }

    const createdIdByTemp = new Map<string, string>();
    for (const pf of proposedFolders) {
      const name = pf.name.trim();
      const key = name.toLowerCase();
      if (!key) continue;
      const existingId = existingNameToId.get(key);
      if (existingId) {
        createdIdByTemp.set(pf.tempId, existingId);
        continue;
      }

      const created = await createFolder(
        name,
        isProActive ? pf.color || DEFAULT_FOLDER_BRAND_HEX : DEFAULT_FOLDER_BRAND_HEX,
        pf.icon,
      );
      createdIdByTemp.set(pf.tempId, created.id);
      existingById.set(created.id, created);
      existingNameToId.set(key, created.id);
    }

    for (const a of assignments) {
      if (a.destination.kind === 'inbox') {
        await setRecordFolder(a.recordId, null);
        continue;
      }
      if (a.destination.kind === 'existingFolder') {
        if (existingById.has(a.destination.folderId)) {
          await setRecordFolder(a.recordId, a.destination.folderId);
        }
        continue;
      }
      const folderId = createdIdByTemp.get(a.destination.tempId);
      if (!folderId) continue;
      await setRecordFolder(a.recordId, folderId);
    }

    navigation.goBack();
  }, [
    assignments,
    createFolder,
    folders,
    isProActive,
    navigation,
    proposedFolders,
    setRecordFolder,
  ]);

  const contentMaxWidth = useTabletContentMaxWidth();

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

  const renderPickerBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const editingFolder = useMemo((): Folder | null => {
    if (!editingTempId) return null;
    const f = proposedFolders.find((x) => x.tempId === editingTempId);
    if (!f) return null;
    return {
      id: f.tempId,
      name: f.name,
      icon: f.icon,
      color: f.color || DEFAULT_FOLDER_BRAND_HEX,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    };
  }, [editingTempId, proposedFolders]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('folders.autoOrganizeReviewTitle')}
        onBack={() => navigation.goBack()}
        titleAlign="left"
        rightSlot={
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<Check size={22} color={color.accent.success} strokeWidth={2.5} />}
            color={color}
            onPress={() => {
              void apply();
            }}
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
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 13, color: color.text.secondary, marginBottom: 8 }}>
            {t('folders.autoOrganizeReviewSubtitle')}
          </Text>
          <SectionHeader title={t('folders.autoOrganizeReviewFoldersSection')} isFirst />
          <View
            style={{
              marginBottom: 16,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
            }}
          >
            {proposedFolders.map((f, idx) => (
              <Pressable
                key={f.tempId}
                onPress={() => setEditingTempId(f.tempId)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: idx < proposedFolders.length - 1 ? 1 : 0,
                  borderBottomColor: color.border.default,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: color.background.tertiary,
                    borderWidth: 1,
                    borderColor: color.border.default,
                  }}
                >
                  {(() => {
                    const IconComp = folderIconComponents[parseFolderIconKey(f.icon)];
                    return (
                      <IconComp
                        size={20}
                        color={f.color || DEFAULT_FOLDER_BRAND_HEX}
                        strokeWidth={2}
                      />
                    );
                  })()}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '600', color: color.text.primary }}
                    numberOfLines={1}
                  >
                    {f.name.trim() || t('folders.autoOrganizeReviewUnnamedFolder')}
                  </Text>
                  <Text
                    style={{ marginTop: 2, fontSize: 13, color: color.text.secondary }}
                    numberOfLines={1}
                  >
                    {t('folders.autoOrganizeReviewFolderNoteCount', {
                      count: proposedFolderNoteCountByTempId.get(f.tempId) ?? 0,
                    })}
                  </Text>
                </View>
                <ChevronRight size={18} color={color.text.secondary} strokeWidth={2.4} />
              </Pressable>
            ))}
            {proposedFolders.length === 0 && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text style={{ fontSize: 14, color: color.text.secondary }}>
                  {t('folders.autoOrganizeReviewNoFolders')}
                </Text>
              </View>
            )}
          </View>
          <SectionHeader
            title={t('folders.autoOrganizeReviewAssignmentsSection', {
              defaultValue: t('folders.autoOrganizeReviewAssignmentsSection'),
            })}
            isFirst={false}
          />
          <View>
            {assignments.map((a, idx) => (
              <View
                key={`${a.recordId}-${idx}`}
                style={{
                  marginBottom: 10,
                  borderRadius: 14,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: color.border.default,
                  backgroundColor: color.background.card,
                }}
              >
                <Pressable
                  onPress={() => openPicker(a.recordId)}
                  style={{ paddingHorizontal: 14, paddingVertical: 12 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: color.text.primary }}>
                    {recordTitleById.get(a.recordId) ?? t('folders.autoOrganizeReviewUnknownNote')}
                  </Text>
                  <Text style={{ marginTop: 3, fontSize: 13, color: color.text.secondary }}>
                    {t('folders.autoOrganizeReviewMoveTo', {
                      folder: destinationLabel(a.destination),
                    })}
                  </Text>
                </Pressable>
              </View>
            ))}
            {assignments.length === 0 ? (
              <View style={{ paddingVertical: 28 }}>
                <Text style={{ textAlign: 'center', fontSize: 14, color: color.text.secondary }}>
                  {t('folders.autoOrganizeReviewNoAssignments')}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        ref={pickerRef}
        enableDynamicSizing
        enablePanDownToClose
        enableOverDrag={false}
        backdropComponent={renderPickerBackdrop}
        onDismiss={closePicker}
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
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
              marginBottom: 14,
            }}
          >
            {t('folders.autoOrganizeReviewPickFolderTitle')}
          </Text>

          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
            }}
          >
            <TouchableOpacity
              onPress={() => pickDestination({ kind: 'inbox' })}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: color.border.default,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: color.text.primary, flex: 1 }}>
                {t('folders.autoOrganizeReviewInbox')}
              </Text>
              {isDestinationSelected({ kind: 'inbox' }) ? (
                <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
              ) : null}
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => pickDestination({ kind: 'existingFolder', folderId: f.id })}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: color.border.default,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, color: color.text.primary, flex: 1 }}>{f.name}</Text>
                {isDestinationSelected({ kind: 'existingFolder', folderId: f.id }) ? (
                  <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
                ) : null}
              </TouchableOpacity>
            ))}
            {proposedFolders.map((pf) => (
              <TouchableOpacity
                key={`p-${pf.tempId}`}
                onPress={() => pickDestination({ kind: 'proposedFolder', tempId: pf.tempId })}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, color: color.text.primary, flex: 1 }}>
                  {pf.name.trim() || t('folders.autoOrganizeReviewUnnamedFolder')}
                </Text>
                {isDestinationSelected({ kind: 'proposedFolder', tempId: pf.tempId }) ? (
                  <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 12 }}>
            <Button
              label={t('common.cancel')}
              color={color}
              variant="secondary"
              onPress={closePicker}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <FolderFormModal
        visible={Boolean(editingTempId)}
        folder={editingFolder}
        onClose={() => setEditingTempId(null)}
        onSave={(name, folderColor, icon) => {
          if (!editingTempId) return;
          setProposedFolders((prev) =>
            prev.map((x) =>
              x.tempId === editingTempId ? { ...x, name, color: folderColor, icon } : x,
            ),
          );
          setEditingTempId(null);
        }}
      />
    </View>
  );
};
