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
import { Button } from '@/shared/ui';
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
  <View
    className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
    style={{ backgroundColor: color.background.tertiary }}
  >
    <Text className="text-xs font-medium" style={{ color: color.accent.primary }}>
      {label}
    </Text>
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
    <View className="gap-3 p-4">
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: color.accent.primary + '1A' }}
        >
          <Mic size={22} color={color.accent.primary} strokeWidth={2} />
        </View>
        <View className="gap-0.5">
          <Text className="text-base font-bold" style={{ color: color.text.primary }}>
            Транскрибируется...
          </Text>
          <Text className="text-[13px]" style={{ color: color.text.secondary }}>
            {timeLabel}
          </Text>
        </View>
      </View>

      <View
        className="h-1.5 overflow-hidden rounded-sm"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <Animated.View
          className="h-1.5 rounded-sm"
          style={{ width: trackWidthInterpolated, backgroundColor: color.accent.primary }}
        />
      </View>
      <View className="-mt-1 flex-row justify-between">
        <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
          {clampedProgress}%
        </Text>
        <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
          100%
        </Text>
      </View>
      <Button
        variant="secondary"
        size="lg"
        icon={<X size={16} color={color.text.secondary} strokeWidth={2.5} />}
        label="Отменить"
        color={color}
        onPress={onCancel}
        className="mt-1"
      />
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
        <Text className="text-sm font-bold text-red-700 dark:text-red-400">
          Не удалось транскрибировать
        </Text>
        <Text className="text-xs leading-5 text-red-500 dark:text-red-500">
          Произошла ошибка при обработке аудио. Проверьте, что запись не повреждена, и попробуйте
          ещё раз.
        </Text>
      </View>
    </View>
    <View className="border-t border-red-200 dark:border-red-900">
      <Button
        variant="danger"
        icon={<RefreshCw size={14} color="#ef4444" strokeWidth={2.5} />}
        label="Попробовать снова"
        onPress={onRetry}
        activeOpacity={0.7}
        containerStyle={{ paddingVertical: 12 }}
      />
    </View>
  </View>
);

const AiStatusBadge = ({ aiStatus }: { aiStatus: RecordingStatus }) => {
  const cfg = AI_STATUS_CONFIG[aiStatus];

  return (
    <View className="gap-2.5 rounded-xl p-3" style={{ backgroundColor: cfg.bgColor }}>
      <View className="flex-row items-center gap-2">
        <CheckCircle2 size={18} color={cfg.iconColor} strokeWidth={2} />
        <Text className="text-sm font-semibold" style={{ color: cfg.iconColor }}>
          {cfg.label}
        </Text>
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
  <View className="items-center gap-3 px-6 pb-8 pt-10">
    <View
      className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full"
      style={{ backgroundColor: color.background.tertiary }}
    >
      {icon}
    </View>
    <Text
      className="text-center text-[17px] font-bold tracking-tight"
      style={{ color: color.text.primary }}
    >
      {title}
    </Text>
    <Text className="text-center text-sm leading-5" style={{ color: color.text.secondary }}>
      {description}
    </Text>
    <Button
      variant="primary"
      size="lg"
      icon={buttonIcon}
      label={buttonLabel}
      color={color}
      onPress={onPress}
      activeOpacity={0.85}
      className="mt-2"
    />
    <View className="flex-row items-center gap-1">
      {hintIcon ?? null}
      <Text className="text-xs" style={{ color: color.text.secondary }}>
        {hint}
      </Text>
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
    <View className="gap-3.5 p-4">
      {segments.map((seg) => (
        <View key={seg.id} className="flex-row gap-2.5">
          <Text
            className="mt-0.5 min-w-9 text-xs font-semibold"
            style={{ color: color.accent.primary }}
          >
            {seg.startTime}
          </Text>
          <Text className="flex-1 text-sm leading-[22px]" style={{ color: color.text.primary }}>
            {seg.text}
          </Text>
        </View>
      ))}
      <Button
        variant="secondary"
        size="lg"
        icon={<RefreshCw size={15} color={color.text.secondary} strokeWidth={2} />}
        label="Перетранскрибировать"
        color={color}
        onPress={onTranscribe}
        className="mt-1"
      />
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
          <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} className="mt-0.5" />
        }
        onPress={onGenerate}
        color={color}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
        {summary}
      </Text>
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
          <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} className="mt-0.5" />
        }
        onPress={onExtract}
        color={color}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          className="flex-row items-center gap-3 py-1"
          onPress={() => onToggle(task.id)}
          android_ripple={{ color: color.background.tertiary }}
        >
          {task.isDone ? (
            <CheckCircle2 size={20} color={color.accent.success} strokeWidth={2} />
          ) : (
            <Circle size={20} color={color.icon.muted} strokeWidth={2} />
          )}
          <Text
            className="flex-1 text-sm leading-5"
            style={{
              color: task.isDone ? color.text.secondary : color.text.primary,
              textDecorationLine: task.isDone ? 'line-through' : undefined,
            }}
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
  <View className="flex-row border-b" style={{ borderBottomColor: color.border.default }}>
    {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
      const isActive = tab === active;

      return (
        <TouchableOpacity
          key={tab}
          className="relative flex-1 items-center py-3"
          onPress={() => onSelect(tab)}
          activeOpacity={0.75}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: isActive ? color.accent.primary : color.text.secondary }}
          >
            {TAB_LABELS[tab]}
          </Text>
          {isActive && (
            <View
              className="absolute bottom-0 left-[15%] right-[15%] h-0.5 rounded-sm"
              style={{ backgroundColor: color.accent.primary }}
            />
          )}
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

  const iconBtnBg = { backgroundColor: color.background.tertiary };
  const pinActiveStyle = { backgroundColor: color.accent.primary + '1A' };

  const renderTranscriptContent = () => {
    if (liveRecord.aiStatus === 'processing') {
      return (
        <TranscriptProcessing
          progress={liveRecord.transcriptProgress ?? 0}
          color={color}
          onCancel={handleCancelTranscription}
        />
      );
    }

    if (liveRecord.aiStatus === 'error') {
      return <TranscriptError onRetry={handleRetranscribe} />;
    }

    const showStatusBadge =
      liveRecord.aiStatus === 'done' && (liveRecord.transcriptSegments ?? []).length > 0;

    return (
      <>
        {showStatusBadge && (
          <View className="px-4 pt-4">
            <AiStatusBadge aiStatus="done" />
          </View>
        )}
        <TranscriptTab
          segments={liveRecord.transcriptSegments ?? []}
          color={color}
          onTranscribe={handleRetranscribe}
        />
      </>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
      <View
        className="flex-row items-center justify-between px-4 pb-3"
        style={{ backgroundColor: color.background.secondary, paddingTop: insets.top + 12 }}
      >
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<ChevronLeft size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
        <View className="flex-row items-center gap-2">
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={
              <Pin
                size={18}
                color={liveRecord.isPinned ? color.accent.pin : color.icon.muted}
                strokeWidth={2.2}
                fill={liveRecord.isPinned ? color.accent.pin : 'transparent'}
              />
            }
            color={color}
            onPress={() => togglePin(liveRecord.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            containerStyle={liveRecord.isPinned ? pinActiveStyle : iconBtnBg}
          />
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<Share2 size={18} color={color.icon.muted} strokeWidth={2.2} />}
            color={color}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<MoreVertical size={18} color={color.icon.muted} strokeWidth={2.2} />}
            color={color}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
          <Text
            className="text-xl font-bold tracking-tight"
            style={{ color: color.text.primary }}
            numberOfLines={2}
          >
            {liveRecord.title}
          </Text>

          {liveRecord.tags && liveRecord.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {liveRecord.tags.map((tag) => (
                <Tag key={tag} label={tag} color={color} />
              ))}
            </View>
          )}
          {liveRecord.createdAt && (
            <Text className="mt-0.5 text-xs" style={{ color: color.text.secondary }}>
              {formatRelativeTime(liveRecord.createdAt)}
            </Text>
          )}
        </View>
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
          <TabBar active={activeTab} onSelect={setActiveTab} color={color} />
          {activeTab === 'transcript' && renderTranscriptContent()}
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
