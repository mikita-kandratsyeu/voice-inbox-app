import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, useColorScheme, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { TaskItem, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { getColors } from '@/shared/config';
import { AudioPlayer } from '@/widgets/audio-player';

import type { Tab } from '../config';
import { RecordingDetailCard } from './RecordingDetailCard';
import { RecordingDetailHeader } from './RecordingDetailHeader';
import { RecordingDetailTabBar } from './RecordingDetailTabBar';
import { SummaryTab } from './SummaryTab';
import { TasksTab } from './TasksTab';
import { TranscriptContent } from './TranscriptContent';

export const RecordingDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingDetail'>>();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');

  const { record: routeRecord } = route.params;
  const { records, togglePin } = useRecordStore();

  const liveRecord: VoiceRecord = records.find((r) => r.id === routeRecord.id) ?? routeRecord;

  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(liveRecord.tasks ?? []);

  const handleToggleTask = (id: string) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t)));
  };

  const handleRetranscribe = () => {
    // placeholder — will trigger local Whisper in the future
  };

  const handleCancelTranscription = () => {
    // placeholder — will cancel Whisper job in the future
  };

  const handleGenerateSummary = () => {
    // placeholder — will call AI API in the future
  };

  const handleExtractTasks = () => {
    // placeholder — will call AI API in the future
  };

  return (
    <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
      <RecordingDetailHeader
        record={liveRecord}
        color={color}
        onBack={() => navigation.goBack()}
        onTogglePin={() => togglePin(liveRecord.id)}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <RecordingDetailCard record={liveRecord} color={color} />

        <View className="overflow-hidden rounded-2xl">
          <AudioPlayer
            duration={liveRecord.duration}
            color={color}
            audioPath={liveRecord.audioPath}
          />
        </View>

        <View
          className="overflow-hidden rounded-2xl"
          style={{ backgroundColor: color.background.card }}
        >
          <RecordingDetailTabBar active={activeTab} onSelect={setActiveTab} color={color} />
          {activeTab === 'transcript' && (
            <TranscriptContent
              record={liveRecord}
              color={color}
              onTranscribe={handleRetranscribe}
              onCancelTranscription={handleCancelTranscription}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryTab
              summary={liveRecord.summary ?? ''}
              color={color}
              onGenerate={handleGenerateSummary}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={localTasks}
              color={color}
              onToggle={handleToggleTask}
              onExtract={handleExtractTasks}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};
