import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { SectionHeader } from '@/shared/ui';

import type { AssignmentDraft } from '../model/useAutoOrganizeReview';

type Props = {
  color: Colors;
  assignments: AssignmentDraft[];
  onOpenPicker: (recordId: string) => void;
  getRecordTitle: (recordId: string) => string;
  getDestinationLabel: (destination: AssignmentDraft['destination']) => string;
  assignmentsSectionLabel: string;
  unknownNoteLabel: string;
  noAssignmentsLabel: string;
  getMoveToLabel: (folder: string) => string;
};

export const AutoOrganizeReviewAssignmentsSection = ({
  color,
  assignments,
  onOpenPicker,
  getRecordTitle,
  getDestinationLabel,
  assignmentsSectionLabel,
  unknownNoteLabel,
  noAssignmentsLabel,
  getMoveToLabel,
}: Props) => {
  return (
    <>
      <SectionHeader title={assignmentsSectionLabel} isFirst={false} />
      <View>
        {assignments.map((a, idx) => (
          <View
            key={`${a.recordId}-${idx}`}
            style={{
              marginBottom: 10,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
              shadowColor: color.shadow.color,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: color.shadow.opacity,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Pressable
              onPress={() => onOpenPicker(a.recordId)}
              accessibilityRole="button"
              accessibilityLabel={`${getRecordTitle(a.recordId) || unknownNoteLabel}, ${getMoveToLabel(getDestinationLabel(a.destination))}`}
              style={{ paddingHorizontal: 14, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: color.text.primary }}>
                {getRecordTitle(a.recordId) || unknownNoteLabel}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 13, color: color.text.secondary }}>
                {getMoveToLabel(getDestinationLabel(a.destination))}
              </Text>
            </Pressable>
          </View>
        ))}
        {assignments.length === 0 && (
          <View style={{ paddingVertical: 28 }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: color.text.secondary }}>
              {noAssignmentsLabel}
            </Text>
          </View>
        )}
      </View>
    </>
  );
};
