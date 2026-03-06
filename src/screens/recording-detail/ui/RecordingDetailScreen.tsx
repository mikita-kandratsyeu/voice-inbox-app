import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Cloud,
  FileText,
  ListChecks,
  Mic,
  MoreVertical,
  Pin,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/RootNavigator';
import type { RecordingStatus, TaskItem, TranscriptSegment, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { getColors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { AudioPlayer } from '@/widgets/audio-player';

type Tab = 'transcript' | 'summary' | 'tasks';

const TAB_LABELS: Record<Tab, string> = {
  transcript: 'Транскрипт',
  summary: 'Конспект',
  tasks: 'Задачи',
};

const AI_STATUS_CONFIG: Record<
  RecordingStatus,
  { label: string; iconColor: string; bgColor: string }
> = {
  idle: { label: 'Ожидает обработки', iconColor: '#9ca3af', bgColor: '#f9fafb' },
  processing: { label: 'Транскрипция...', iconColor: '#f59e0b', bgColor: '#fffbeb' },
  done: { label: 'Транскрипт готов', iconColor: '#22c55e', bgColor: '#f0fdf4' },
  error: { label: 'Ошибка транскрипции', iconColor: '#ef4444', bgColor: '#fef2f2' },
};

const Tag = ({ label, color }: { label: string; color: Colors }) => (
  <View style={[styles.tag, { backgroundColor: color.background.tertiary }]}>
    <Text style={[styles.tagText, { color: color.accent.primary }]}>{label}</Text>
  </View>
);

const TranscriptProcessing = ({
  progress,
  color,
  onCancel,
}: {
  progress: number;
  color: Colors;
  onCancel: () => void;
}) => {
  const animatedWidth = useRef(new Animated.Value(progress)).current;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedProgress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, animatedWidth]);

  const secondsLeft = Math.round(((100 - clampedProgress) / 100) * 60);
  const timeLabel =
    secondsLeft < 60
      ? `~${secondsLeft} сек осталось`
      : `~${Math.ceil(secondsLeft / 60)} мин осталось`;

  const trackWidthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.processingContainer}>
      <View style={styles.processingHeader}>
        <View style={[styles.processingIconWrap, { backgroundColor: color.accent.primary + '1A' }]}>
          <Mic size={22} color={color.accent.primary} strokeWidth={2} />
        </View>
        <View style={styles.processingInfo}>
          <Text style={[styles.processingTitle, { color: color.text.primary }]}>
            Транскрибируется...
          </Text>
          <Text style={[styles.processingSubtitle, { color: color.text.secondary }]}>
            {timeLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: color.background.tertiary }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: trackWidthInterpolated, backgroundColor: color.accent.primary },
          ]}
        />
      </View>

      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, { color: color.text.secondary }]}>
          {clampedProgress}%
        </Text>
        <Text style={[styles.progressLabel, { color: color.text.secondary }]}>100%</Text>
      </View>

      <TouchableOpacity
        style={[styles.cancelBtn, { backgroundColor: color.background.tertiary }]}
        onPress={onCancel}
        activeOpacity={0.75}
      >
        <X size={16} color={color.text.secondary} strokeWidth={2.5} />
        <Text style={[styles.cancelBtnText, { color: color.text.secondary }]}>Отменить</Text>
      </TouchableOpacity>
    </View>
  );
};

const TranscriptError = ({ onRetry }: { onRetry: () => void }) => (
  <View className="m-4 overflow-hidden rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
    <View className="flex-row items-start gap-3 p-4">
      <View className="mt-0.5 rounded-full bg-red-100 p-1.5 dark:bg-red-900">
        <AlertCircle size={18} color="#ef4444" strokeWidth={2} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-700 text-red-700 dark:text-red-400" style={styles.errorTitle}>
          Не удалось транскрибировать
        </Text>
        <Text className="text-xs leading-5 text-red-500 dark:text-red-500">
          Произошла ошибка при обработке аудио. Проверьте, что запись не повреждена, и попробуйте
          ещё раз.
        </Text>
      </View>
    </View>
    <View className="border-t border-red-200 dark:border-red-900">
      <TouchableOpacity
        className="flex-row items-center justify-center gap-2 py-3 active:opacity-70"
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <RefreshCw size={14} color="#ef4444" strokeWidth={2.5} />
        <Text
          className="text-sm font-600 text-red-600 dark:text-red-400"
          style={styles.errorRetryText}
        >
          Попробовать снова
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

const AiStatusBadge = ({ aiStatus }: { aiStatus: RecordingStatus }) => {
  const cfg = AI_STATUS_CONFIG[aiStatus];

  return (
    <View style={[styles.aiBadgeContainer, { backgroundColor: cfg.bgColor }]}>
      <View style={styles.aiBadgeRow}>
        <CheckCircle2 size={18} color={cfg.iconColor} strokeWidth={2} />
        <Text style={[styles.aiBadgeText, { color: cfg.iconColor }]}>{cfg.label}</Text>
      </View>
    </View>
  );
};

type TabEmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  hint: string;
  hintIcon?: React.ReactNode;
  onPress: () => void;
  color: Colors;
};

const TabEmptyState = ({
  icon,
  title,
  description,
  buttonLabel,
  buttonIcon,
  hint,
  hintIcon,
  onPress,
  color,
}: TabEmptyStateProps) => (
  <View style={styles.emptyContainer}>
    <View style={[styles.emptyIconWrap, { backgroundColor: color.background.tertiary }]}>
      {icon}
    </View>
    <Text style={[styles.emptyTitle, { color: color.text.primary }]}>{title}</Text>
    <Text style={[styles.emptyDescription, { color: color.text.secondary }]}>{description}</Text>
    <TouchableOpacity
      style={[styles.emptyBtn, { backgroundColor: color.accent.primary }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {buttonIcon}
      <Text style={styles.emptyBtnText}>{buttonLabel}</Text>
    </TouchableOpacity>
    <View style={styles.emptyHintRow}>
      {hintIcon ?? null}
      <Text style={[styles.emptyHint, { color: color.text.secondary }]}>{hint}</Text>
    </View>
  </View>
);

const TranscriptTab = ({
  segments,
  color,
  onTranscribe,
}: {
  segments: TranscriptSegment[];
  color: Colors;
  onTranscribe: () => void;
}) => {
  if (segments.length === 0) {
    return (
      <TabEmptyState
        icon={<Mic size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title="Транскрипт не создан"
        description={'Нажмите кнопку ниже, чтобы\nтранскрибировать запись на устройстве.'}
        buttonLabel="Транскрибировать"
        buttonIcon={<Mic size={18} color="#fff" strokeWidth={2} />}
        hint="Whisper · Оффлайн · Приватно"
        onPress={onTranscribe}
        color={color}
      />
    );
  }

  return (
    <View style={styles.tabContent}>
      {segments.map((seg) => (
        <View key={seg.id} style={styles.segmentRow}>
          <Text style={[styles.segmentTime, { color: color.accent.primary }]}>{seg.startTime}</Text>
          <Text style={[styles.segmentText, { color: color.text.primary }]}>{seg.text}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.retranscribeBtn, { backgroundColor: color.background.tertiary }]}
        onPress={onTranscribe}
        activeOpacity={0.75}
      >
        <RefreshCw size={15} color={color.text.secondary} strokeWidth={2} />
        <Text style={[styles.retranscribeBtnText, { color: color.text.secondary }]}>
          Перетранскрибировать
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const SummaryTab = ({
  summary,
  color,
  onGenerate,
}: {
  summary: string;
  color: Colors;
  onGenerate: () => void;
}) => {
  if (!summary) {
    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title="Конспект не создан"
        description={'Нажмите кнопку ниже, чтобы\nсоздать краткий конспект с помощью Gemini.'}
        buttonLabel="Создать конспект"
        buttonIcon={<FileText size={18} color="#fff" strokeWidth={2} />}
        hint="Gemini · Требует подключения к интернету"
        hintIcon={
          <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} style={styles.hintIcon} />
        }
        onPress={onGenerate}
        color={color}
      />
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.summaryText, { color: color.text.primary }]}>{summary}</Text>
    </View>
  );
};

const TasksTab = ({
  tasks,
  color,
  onToggle,
  onExtract,
}: {
  tasks: TaskItem[];
  color: Colors;
  onToggle: (id: string) => void;
  onExtract: () => void;
}) => {
  if (tasks.length === 0) {
    return (
      <TabEmptyState
        icon={<ListChecks size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title="Задачи не извлечены"
        description={'Нажмите кнопку ниже, чтобы\nавтоматически найти задачи с помощью Gemini.'}
        buttonLabel="Найти задачи"
        buttonIcon={<ListChecks size={18} color="#fff" strokeWidth={2} />}
        hint="Gemini · Требует подключения к интернету"
        hintIcon={
          <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} style={styles.hintIcon} />
        }
        onPress={onExtract}
        color={color}
      />
    );
  }

  return (
    <View style={styles.tabContent}>
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          style={styles.taskRow}
          onPress={() => onToggle(task.id)}
          android_ripple={{ color: color.background.tertiary }}
        >
          {task.isDone ? (
            <CheckCircle2 size={20} color={color.accent.success} strokeWidth={2} />
          ) : (
            <Circle size={20} color={color.icon.muted} strokeWidth={2} />
          )}
          <Text
            style={[
              styles.taskText,
              { color: task.isDone ? color.text.secondary : color.text.primary },
              task.isDone && styles.taskTextDone,
            ]}
          >
            {task.text}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const TabBar = ({
  active,
  onSelect,
  color,
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  color: Colors;
}) => (
  <View style={[styles.tabBar, { borderBottomColor: color.border.default }]}>
    {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
      const isActive = tab === active;
      return (
        <TouchableOpacity
          key={tab}
          style={[styles.tabItem, isActive && styles.tabItemActive]}
          onPress={() => onSelect(tab)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: isActive ? color.accent.primary : color.text.secondary },
            ]}
          >
            {TAB_LABELS[tab]}
          </Text>
          {isActive ? (
            <View style={[styles.tabIndicator, { backgroundColor: color.accent.primary }]} />
          ) : null}
        </TouchableOpacity>
      );
    })}
  </View>
);

export const RecordingDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingDetail'>>();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();

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

  const screenBg = { backgroundColor: color.background.secondary };
  const headerBg = { backgroundColor: color.background.secondary };
  const iconBtnBg = { backgroundColor: color.background.tertiary };
  const pinActiveStyle = { backgroundColor: color.accent.primary + '1A' };

  return (
    <View style={[styles.flex, screenBg]}>
      <View style={[styles.header, headerBg, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, iconBtnBg]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={color.text.primary} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, liveRecord.isPinned ? pinActiveStyle : iconBtnBg]}
            onPress={() => togglePin(liveRecord.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Pin
              size={18}
              color={liveRecord.isPinned ? color.accent.pin : color.icon.muted}
              strokeWidth={2.2}
              fill={liveRecord.isPinned ? color.accent.pin : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, iconBtnBg]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Share2 size={18} color={color.icon.muted} strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, iconBtnBg]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={18} color={color.icon.muted} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContentWithBottom}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.metaCard, { backgroundColor: color.background.card }]}>
          <Text style={[styles.title, { color: color.text.primary }]} numberOfLines={2}>
            {liveRecord.title}
          </Text>

          {liveRecord.tags && liveRecord.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {liveRecord.tags.map((tag) => (
                <Tag key={tag} label={tag} color={color} />
              ))}
            </View>
          ) : null}

          {liveRecord.createdAt ? (
            <Text style={[styles.relativeTime, { color: color.text.secondary }]}>
              {formatRelativeTime(liveRecord.createdAt)}
            </Text>
          ) : null}
        </View>

        <View style={styles.playerSection}>
          <AudioPlayer duration={liveRecord.duration} color={color} />
        </View>

        <View style={[styles.contentCard, { backgroundColor: color.background.card }]}>
          <TabBar active={activeTab} onSelect={setActiveTab} color={color} />

          {activeTab === 'transcript' ? (
            <>
              {liveRecord.aiStatus === 'processing' ? (
                <TranscriptProcessing
                  progress={liveRecord.transcriptProgress ?? 0}
                  color={color}
                  onCancel={handleCancelTranscription}
                />
              ) : liveRecord.aiStatus === 'error' ? (
                <TranscriptError onRetry={handleRetranscribe} />
              ) : (
                <>
                  {liveRecord.aiStatus === 'done' &&
                  (liveRecord.transcriptSegments ?? []).length > 0 ? (
                    <View style={styles.statusSection}>
                      <AiStatusBadge aiStatus={liveRecord.aiStatus} />
                    </View>
                  ) : null}
                  <TranscriptTab
                    segments={liveRecord.transcriptSegments ?? []}
                    color={color}
                    onTranscribe={handleRetranscribe}
                  />
                </>
              )}
            </>
          ) : null}

          {activeTab === 'summary' ? (
            <SummaryTab
              summary={liveRecord.summary ?? ''}
              color={color}
              onGenerate={handleGenerateSummary}
            />
          ) : null}

          {activeTab === 'tasks' ? (
            <TasksTab
              tasks={localTasks}
              color={color}
              onToggle={handleToggleTask}
              onExtract={handleExtractTasks}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  scrollContentWithBottom: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  metaCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  relativeTime: {
    fontSize: 12,
    marginTop: 2,
  },
  playerSection: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  contentCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2,
    borderRadius: 1,
  },
  statusSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  processingContainer: {
    padding: 16,
    gap: 12,
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingInfo: {
    gap: 2,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  processingSubtitle: {
    fontSize: 13,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 100,
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorTitle: {
    fontWeight: '700',
  },
  errorRetryText: {
    fontWeight: '600',
  },
  aiBadgeContainer: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  retranscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 100,
    marginTop: 4,
  },
  retranscribeBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    padding: 16,
    gap: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 100,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyHint: {
    fontSize: 12,
  },
  hintIcon: {
    marginTop: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentTime: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
    marginTop: 2,
  },
  segmentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 24,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
  },
});
