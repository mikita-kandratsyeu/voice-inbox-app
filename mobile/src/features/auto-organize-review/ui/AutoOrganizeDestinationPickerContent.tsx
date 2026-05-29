import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import type { Folder } from '@/entities/folder';
import { FolderPickerRow } from '@/entities/folder/ui/FolderPickerRow';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { resolveFolderListTintHex } from '@/shared/lib';
import { Button } from '@/shared/ui';

import type { AssignmentDraft, ProposedFolderDraft } from '../model/useAutoOrganizeReview';

type Props = {
  color: Colors;
  isProActive: boolean;
  folders: Folder[];
  visibleProposedFolders: ProposedFolderDraft[];
  onPickDestination: (destination: AssignmentDraft['destination']) => void;
  isDestinationSelected: (destination: AssignmentDraft['destination']) => boolean;
  onClose: () => void;
  pickFolderTitle: string;
  inboxLabel: string;
  unnamedFolderLabel: string;
  cancelLabel: string;
};

export const AutoOrganizeDestinationPickerContent = ({
  color,
  isProActive,
  folders,
  visibleProposedFolders,
  onPickDestination,
  isDestinationSelected,
  onClose,
  pickFolderTitle,
  inboxLabel,
  unnamedFolderLabel,
  cancelLabel,
}: Props) => {
  const scheme = useAppTheme();

  const rows = useMemo(() => {
    const inbox = {
      key: 'inbox',
      inbox: true as const,
      label: inboxLabel,
      iconId: undefined,
      tintHex: undefined,
      selected: isDestinationSelected({ kind: 'inbox' }),
      onPress: () => onPickDestination({ kind: 'inbox' }),
    };

    const existing = folders.map((f) => ({
      key: `existing-${f.id}`,
      inbox: false as const,
      label: f.name,
      iconId: f.icon,
      tintHex: resolveFolderListTintHex(f.color, isProActive, scheme),
      selected: isDestinationSelected({ kind: 'existingFolder', folderId: f.id }),
      onPress: () => onPickDestination({ kind: 'existingFolder', folderId: f.id }),
    }));

    const proposed = visibleProposedFolders.map((pf) => ({
      key: `proposed-${pf.tempId}`,
      inbox: false as const,
      label: pf.name.trim() || unnamedFolderLabel,
      iconId: pf.icon,
      tintHex: resolveFolderListTintHex(pf.color, isProActive, scheme),
      selected: isDestinationSelected({ kind: 'proposedFolder', tempId: pf.tempId }),
      onPress: () => onPickDestination({ kind: 'proposedFolder', tempId: pf.tempId }),
    }));

    return [inbox, ...existing, ...proposed];
  }, [
    folders,
    inboxLabel,
    isDestinationSelected,
    isProActive,
    onPickDestination,
    scheme,
    unnamedFolderLabel,
    visibleProposedFolders,
  ]);

  return (
    <>
      <Text
        style={{
          color: color.text.primary,
          fontSize: 17,
          fontWeight: '600',
          marginBottom: 14,
          paddingTop: 4,
          textAlign: 'center',
        }}
      >
        {pickFolderTitle}
      </Text>
      <View
        style={{
          backgroundColor: color.background.card,
          borderColor: color.border.default,
          borderRadius: 12,
          borderWidth: 1,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <FolderPickerRow
            key={row.key}
            label={row.label}
            color={color}
            inbox={row.inbox}
            iconId={row.iconId}
            tintHex={row.tintHex}
            selected={row.selected}
            showSelectionCheck
            isLast={index === rows.length - 1}
            onPress={row.onPress}
          />
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <Button label={cancelLabel} color={color} variant="secondary" fullWidth onPress={onClose} />
      </View>
    </>
  );
};
