import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRelatedNotes } from '@/features/related-notes';
import type { Colors } from '@/shared/config';

type RelatedNotesSectionProps = {
  recordId: string;
  color: Colors;
};

export const RelatedNotesSection = ({ recordId, color }: RelatedNotesSectionProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const relatedNotes = useRelatedNotes(recordId, 5);

  if (relatedNotes.length === 0) return null;

  const handlePress = (record: VoiceRecord) => {
    navigation.navigate('RecordingDetail', { record });
  };

  return (
    <View className="gap-2">
      <Text
        className="text-xs font-semibold uppercase px-1"
        style={{ color: color.text.secondary }}
      >
        {t('recordingDetail.relatedNotes')}
      </Text>
      <View className="gap-2">
        {relatedNotes.map((record) => (
          <Pressable
            key={record.id}
            accessibilityRole="button"
            accessibilityLabel={record.title}
            onPress={() => handlePress(record)}
            className="flex-row items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: color.background.card }}
          >
            <FileText size={18} color={color.icon.muted} strokeWidth={2} />
            <View className="flex-1 min-w-0">
              <Text
                className="text-sm font-medium"
                style={{ color: color.text.primary }}
                numberOfLines={1}
              >
                {record.title}
              </Text>
              {record.summary ? (
                <Text
                  className="text-xs mt-0.5"
                  style={{ color: color.text.secondary }}
                  numberOfLines={2}
                >
                  {record.summary}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
