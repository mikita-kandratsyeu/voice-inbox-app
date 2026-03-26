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
        <TouchableOpacity
          onPress={() => onPickDestination({ kind: 'inbox' })}
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
          <Text style={{ fontSize: 16, color: color.text.primary, flex: 1 }}>{inboxLabel}</Text>
          {isDestinationSelected({ kind: 'inbox' }) && (
            <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
          )}
        </TouchableOpacity>
        {folders.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => onPickDestination({ kind: 'existingFolder', folderId: f.id })}
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
            {isDestinationSelected({ kind: 'existingFolder', folderId: f.id }) && (
              <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
            )}
          </TouchableOpacity>
        ))}
        {visibleProposedFolders.map((pf) => (
          <TouchableOpacity
            key={`p-${pf.tempId}`}
            onPress={() => onPickDestination({ kind: 'proposedFolder', tempId: pf.tempId })}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: color.text.primary, flex: 1 }}>
              {pf.name.trim() || unnamedFolderLabel}
            </Text>
            {isDestinationSelected({ kind: 'proposedFolder', tempId: pf.tempId }) && (
              <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <Button label={cancelLabel} color={color} variant="secondary" onPress={onClose} />
      </View>
    </>
  );
};
