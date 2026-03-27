import { Check } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { Button } from '@/shared/ui';

import type { AssignmentDraft, ProposedFolderDraft } from '../model/useAutoOrganizeReview';

type Props = {
  color: Colors;
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
  const rows = [
    {
      key: 'inbox',
      label: inboxLabel,
      onPress: () => onPickDestination({ kind: 'inbox' }),
      selected: isDestinationSelected({ kind: 'inbox' }),
    },
    ...folders.map((f) => ({
      key: `existing-${f.id}`,
      label: f.name,
      onPress: () => onPickDestination({ kind: 'existingFolder', folderId: f.id }),
      selected: isDestinationSelected({ kind: 'existingFolder', folderId: f.id }),
    })),
    ...visibleProposedFolders.map((pf) => ({
      key: `proposed-${pf.tempId}`,
      label: pf.name.trim() || unnamedFolderLabel,
      onPress: () => onPickDestination({ kind: 'proposedFolder', tempId: pf.tempId }),
      selected: isDestinationSelected({ kind: 'proposedFolder', tempId: pf.tempId }),
    })),
  ];

  return (
    <>
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
        {pickFolderTitle}
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
        {rows.map((row, index) => (
          <TouchableOpacity
            key={row.key}
            onPress={row.onPress}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: index < rows.length - 1 ? 1 : 0,
              borderBottomColor: color.border.default,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: color.text.primary, flex: 1 }}>{row.label}</Text>
            {row.selected && <Check size={18} color={color.accent.primary} strokeWidth={2.6} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <Button label={cancelLabel} color={color} variant="secondary" onPress={onClose} />
      </View>
    </>
  );
};
