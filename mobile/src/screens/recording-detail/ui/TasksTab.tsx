import { MenuView } from '@react-native-menu/menu';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Circle,
  ListChecks,
  MoreHorizontal,
  Plus,
  RefreshCw,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

import type { RecordingStatus, TaskItem } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAddToCalendar } from '@/features/add-to-calendar';
import { useAddToReminder } from '@/features/add-to-reminder';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { useAiModelName, useAiTabBannerDismiss, useNetworkStatus } from '@/shared/lib';
import {
  AiTabErrorBanner,
  AiTabHintIcon,
  Button,
  getInputFieldInputStyle,
  InputField,
  TabEmptyState,
} from '@/shared/ui';

import { AiTabProcessing } from './AiTabProcessing';
import { PrivateModeTranscriptLimitNotice } from './PrivateModeTranscriptLimitNotice';
import { TaskEditSheet } from './TaskEditSheet';
import { TaskReextractHintSheet } from './TaskReextractHintSheet';

type TaskEditValue = {
  text: string;
  deadline?: string | null;
  deadlineTime?: string | null;
  priority?: TaskItem['priority'];
};

type TasksTabProps = {
  tasks: TaskItem[];
  nextSteps?: string[];
  status: RecordingStatus;
  errorMessage?: string;
  hasTranscript?: boolean;
  recordTitle: string;
  color: Colors;
  onToggle: (id: string) => void;
  onExtract: (options?: { taskExtractionHint?: string }) => void;
  onAddManualTask: (text: string) => void;
  onPromoteNextStepToTask: (step: string, stepIndex: number) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (taskId: string, value: TaskEditValue) => boolean;
  onDismissError?: () => void;
  showPrivateModeCta?: boolean;
  onSwitchToSmartMode?: () => void;
  onCancelProcessing?: () => void;
  isPrivateMode?: boolean;
  isPrivateCustomServer?: boolean;
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
  privateAiBatchStartedAt?: number;
  transcriptCharCount?: number;
  cloudMeetingDialogueExtra?: boolean;
};

const ManualTaskAddRow = ({
  color,
  onAdd,
  hint,
}: {
  color: Colors;
  onAdd: (text: string) => void;
  hint?: string;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
    KeyboardController.dismiss({ animated: true });
  };

  return (
    <View className="gap-2">
      {hint !== undefined && hint.length > 0 && (
        <Text className="text-center text-sm leading-5" style={{ color: color.text.secondary }}>
          {hint}
        </Text>
      )}
      <InputField
        color={color}
        hasValue={draft.length > 0}
        containerStyle={{ paddingVertical: 10 }}
        rightElement={
          <Pressable
            onPress={submit}
            disabled={draft.trim().length === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('tasks.addTask')}
            accessibilityState={{ disabled: draft.trim().length === 0 }}
          >
            <Plus
              size={16}
              color={color.accent.primary}
              strokeWidth={2.25}
              style={{ flexShrink: 0 }}
            />
          </Pressable>
        }
      >
        <TextInput
          style={getInputFieldInputStyle(color)}
          placeholder={t('recordingDetail.addTaskPlaceholder')}
          placeholderTextColor={color.text.secondary}
          accessibilityLabel={t('recordingDetail.addTaskPlaceholder')}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </InputField>
    </View>
  );
};

export const TasksTab = ({
  tasks,
  nextSteps = [],
  status,
  errorMessage,
  hasTranscript = true,
  recordTitle,
  color,
  onToggle,
  onExtract,
  onAddManualTask,
  onPromoteNextStepToTask,
  onDeleteTask,
  onEditTask,
  onDismissError,
  onCancelProcessing,
  privateAiBatchPhase,
  privateAiBatchProgress,
  privateAiBatchProgressLabel,
  privateAiBatchStartedAt,
  transcriptCharCount,
  cloudMeetingDialogueExtra = false,
  showPrivateModeCta = false,
  onSwitchToSmartMode: _onSwitchToSmartMode,
  isPrivateMode = false,
  isPrivateCustomServer = false,
}: TasksTabProps) => {
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const { t } = useTranslation();
  const { showBanner, handleDismiss } = useAiTabBannerDismiss(status, onDismissError);
  const aiModelName = useAiModelName();
  const modelHint = aiModelName.trim() ? aiModelName : undefined;
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';

  const { addTaskToCalendar } = useAddToCalendar();
  const { addTaskToReminder } = useAddToReminder();

  const [reextractSheetOpen, setReextractSheetOpen] = useState(false);
  const [editTaskTarget, setEditTaskTarget] = useState<
    Pick<TaskItem, 'id' | 'text' | 'deadline' | 'deadlineTime' | 'priority'> | null
  >(null);

  const reextractSheet = useMemo(
    () => (
      <TaskReextractHintSheet
        visible={reextractSheetOpen}
        onClose={() => setReextractSheetOpen(false)}
        onConfirm={(hint) => {
          onExtract(hint ? { taskExtractionHint: hint } : undefined);
        }}
      />
    ),
    [reextractSheetOpen, onExtract],
  );

  const editTaskSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={editTaskTarget !== null}
        initialText={editTaskTarget?.text ?? ''}
        initialDeadline={editTaskTarget?.deadline}
        initialDeadlineTime={editTaskTarget?.deadlineTime}
        initialPriority={editTaskTarget?.priority}
        showMetadataFields
        onClose={() => setEditTaskTarget(null)}
        onSave={(value) => {
          if (!editTaskTarget) return false;
          return onEditTask(editTaskTarget.id, value);
        }}
      />
    ),
    [editTaskTarget, onEditTask],
  );

  const showPermissionAlert = (_: string) => {
    Alert.alert(t('common.error'), t('tasks.permissionDenied'));
  };

  if (status === 'processing') {
    return (
      <>
        <AiTabProcessing
          variant="tasks"
          progress={privateAiBatchProgress ?? 0}
          progressLabel={privateAiBatchProgressLabel}
          phase={
            privateAiBatchPhase ??
            (isPrivateCustomServer ? 'processing' : isPrivateMode ? 'loading_model' : 'processing')
          }
          color={color}
          onCancel={onCancelProcessing}
          isPrivateMode={isPrivateMode}
          isPrivateCustomServer={isPrivateCustomServer}
          processingStartedAtMs={privateAiBatchStartedAt}
          transcriptCharCount={transcriptCharCount}
          cloudMeetingDialogueExtra={cloudMeetingDialogueExtra}
        />
        {reextractSheet}
        {editTaskSheet}
      </>
    );
  }

  if (status === 'error' && tasks.length === 0) {
    return (
      <>
        <View>
          <TabEmptyState
            icon={<AlertCircle size={28} color={color.accent.delete} strokeWidth={1.8} />}
            title={t('recordingDetail.tasksError')}
            description={
              errorMessage ?? (showPrivateModeCta ? t('recordingDetail.privateModeErrorHint') : '')
            }
            buttonLabel={t('recordingDetail.tasksRetry')}
            buttonIcon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
            onPress={() => setReextractSheetOpen(true)}
          />
          <View className="px-6 pb-8">
            <ManualTaskAddRow
              color={color}
              onAdd={onAddManualTask}
              hint={t('recordingDetail.tasksManualHint')}
            />
          </View>
        </View>
        {reextractSheet}
        {editTaskSheet}
      </>
    );
  }

  if (!hasTranscript && tasks.length === 0) {
    return (
      <>
        <View>
          <TabEmptyState
            icon={<ListChecks size={28} color={color.icon.muted} strokeWidth={1.8} />}
            title={t('recordingDetail.noTranscriptForAi')}
            description={t('recordingDetail.noTranscriptForAiDesc')}
            hideButton
          />
          <View className="px-6 pb-8">
            <ManualTaskAddRow
              color={color}
              onAdd={onAddManualTask}
              hint={t('recordingDetail.tasksManualWithoutTranscriptHint')}
            />
          </View>
        </View>
        {reextractSheet}
        {editTaskSheet}
      </>
    );
  }

  if (tasks.length === 0) {
    return (
      <>
        <View className="gap-3 p-4">
          <PrivateModeTranscriptLimitNotice
            color={color}
            transcriptCharCount={transcriptCharCount}
          />
          <TabEmptyState
            icon={<ListChecks size={28} color={color.icon.muted} strokeWidth={1.8} />}
            title={t('recordingDetail.tasksNotExtracted')}
            description={t('recordingDetail.tasksNotExtractedDesc')}
            buttonLabel={t('recordingDetail.extractTasks')}
            buttonIcon={<ListChecks size={18} color="#fff" strokeWidth={2} />}
            hint={modelHint}
            hintIcon={modelHint ? <AiTabHintIcon /> : undefined}
            disabled={disableByNetwork}
            onPress={() => onExtract(undefined)}
          />
          <View className="px-6 pb-8">
            <ManualTaskAddRow
              color={color}
              onAdd={onAddManualTask}
              hint={t('recordingDetail.tasksManualHint')}
            />
          </View>
        </View>
        {reextractSheet}
        {editTaskSheet}
      </>
    );
  }

  return (
    <>
      <View className="gap-3.5 p-4">
        {showBanner && (
          <AiTabErrorBanner
            message={t('recordingDetail.tasksErrorBanner')}
            onDismiss={handleDismiss}
          />
        )}
        {tasks.map((task) => {
          const menuActions = [
            {
              id: 'addToCalendar',
              title: t('tasks.addToCalendar'),
              image: 'calendar',
              imageColor: color.text.primary,
              titleColor: color.text.primary,
            },
            {
              id: 'addToReminder',
              title: t('tasks.addToReminder'),
              image: 'bell',
              imageColor: color.text.primary,
              titleColor: color.text.primary,
            },
            {
              id: 'editTask',
              title: t('tasks.editTask'),
              image: 'pencil',
              imageColor: color.text.primary,
              titleColor: color.text.primary,
            },
            {
              id: 'deleteTask',
              title: t('tasks.deleteTask'),
              image: 'trash',
              imageColor: color.accent.delete,
              titleColor: color.accent.delete,
              attributes: { destructive: true },
            },
          ];

          return (
            <View key={task.id} className="flex-row items-center gap-2 py-1">
              <Pressable
                className="min-w-0 flex-1 flex-row items-center gap-4 py-0.5"
                onPress={() => onToggle(task.id)}
                style={{ minWidth: 0 }}
                accessibilityRole="checkbox"
                accessibilityLabel={task.text}
                accessibilityState={{ checked: task.isDone }}
              >
                {task.isDone ? (
                  <CheckCircle2 size={20} color={color.accent.success} strokeWidth={2} />
                ) : (
                  <Circle size={20} color={color.icon.muted} strokeWidth={2} />
                )}
                <Text
                  className="min-w-0 flex-1 text-sm leading-5"
                  style={{
                    color: task.isDone ? color.text.secondary : color.text.primary,
                    textDecorationLine: task.isDone ? 'line-through' : undefined,
                  }}
                >
                  {task.text}
                </Text>
              </Pressable>
              <View style={{ flexShrink: 0 }}>
                <MenuView
                  key={`task-menu-${task.id}-${theme}`}
                  title=""
                  themeVariant={isDark ? 'dark' : 'light'}
                  shouldOpenOnLongPress={false}
                  onPressAction={async ({ nativeEvent }) => {
                    if (nativeEvent.event === 'editTask') {
                      setEditTaskTarget({
                        id: task.id,
                        text: task.text,
                        deadline: task.deadline,
                        deadlineTime: task.deadlineTime,
                        priority: task.priority,
                      });
                    }
                    if (nativeEvent.event === 'addToCalendar') {
                      await addTaskToCalendar(
                        task,
                        recordTitle,
                        () => Alert.alert(t('tasks.addedToCalendar')),
                        showPermissionAlert,
                      );
                    }
                    if (nativeEvent.event === 'addToReminder') {
                      await addTaskToReminder(
                        task,
                        recordTitle,
                        () => Alert.alert(t('tasks.addedToReminders')),
                        showPermissionAlert,
                      );
                    }
                    if (nativeEvent.event === 'deleteTask') {
                      Alert.alert(t('tasks.deleteTask'), t('tasks.deleteTaskConfirm'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('tasks.deleteTask'),
                          style: 'destructive',
                          onPress: () => onDeleteTask(task.id),
                        },
                      ]);
                    }
                  }}
                  actions={menuActions}
                >
                  <Pressable
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('tasks.taskMenu')}
                  >
                    <MoreHorizontal size={18} color={color.icon.muted} strokeWidth={2} />
                  </Pressable>
                </MenuView>
              </View>
            </View>
          );
        })}
        <ManualTaskAddRow color={color} onAdd={onAddManualTask} />
        {nextSteps.length > 0 && (
          <View className="mt-4 gap-2">
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: color.text.secondary }}
            >
              {t('recordingDetail.nextSteps')}
            </Text>
            {nextSteps.map((step, idx) => (
              <Pressable
                key={`${idx}-${step}`}
                onPress={() => {
                  void onPromoteNextStepToTask(step, idx);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('recordingDetail.nextStepAddA11y', { text: step })}
                className="flex-row items-center gap-2.5 py-4"
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: color.background.tertiary,
                }}
              >
                <Text
                  className="min-w-0 flex-1 text-sm leading-5"
                  style={{ color: color.text.primary }}
                >
                  {step}
                </Text>
                <Plus
                  size={16}
                  color={color.accent.primary}
                  strokeWidth={2.25}
                  style={{ flexShrink: 0 }}
                />
              </Pressable>
            ))}
          </View>
        )}
        <View className="mt-4 flex-row items-center gap-3">
          <Button
            variant="ghost"
            size="md"
            icon={<RefreshCw size={16} color={color.text.secondary} strokeWidth={2} />}
            label={t('recordingDetail.reextractTasks')}
            color={color}
            onPress={() => setReextractSheetOpen(true)}
            disabled={disableByNetwork || !hasTranscript}
            containerStyle={{ flex: 1, minWidth: 0 }}
          />
          <Button
            variant="primary"
            size="md"
            icon={<Bell size={16} color={color.icon.onAccent} strokeWidth={2} />}
            label={t('tasks.addAllShort')}
            color={color}
            onPress={async () => {
              let added = 0;

              for (const task of tasks) {
                const ok = await addTaskToReminder(
                  task,
                  recordTitle,
                  undefined,
                  showPermissionAlert,
                );

                if (!ok) {
                  break;
                }

                added += 1;
              }

              if (added > 0) {
                Alert.alert(t('tasks.addedToReminders'));
              }
            }}
            containerStyle={{ flex: 1, minWidth: 0 }}
          />
        </View>
      </View>
      {reextractSheet}
      {editTaskSheet}
    </>
  );
};
