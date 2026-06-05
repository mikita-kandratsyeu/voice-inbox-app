import { CheckCircle2, Clock, ListChecks, Pin } from 'lucide-react-native';
import React, { memo, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { SwipeableCardContext, Tag } from '@/shared/ui';

import { AiStatusPill } from './AiStatusPill';

type RecordCardProps = {
  item: VoiceRecord;
  color: Colors;
  folderAccentColor?: string;
  onPress: () => void;
  onStatusPress: () => void;
  onLongPress?: () => void;
  a11yHint?: string | null;
  hideAccessibilitySubtree?: boolean;
};

export const RecordCard = memo(function RecordCard({
  item,
  color,
  folderAccentColor,
  onPress,
  onStatusPress,
  onLongPress,
  a11yHint,
  hideAccessibilitySubtree = false,
}: RecordCardProps) {
  const { i18n, t } = useTranslation();
  const { isSwiping } = useContext(SwipeableCardContext);
  const cardStyle = {
    shadowColor: color.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: color.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: color.background.card,
  };
  const pinIconStyle = { marginRight: 6 };
  const textPrimaryStyle = { color: color.text.primary };
  const textSecondaryStyle = { color: color.text.secondary };

  const hasTags = item.tags && item.tags.length > 0;
  const hasAudio = Boolean(item.audioPath?.trim());
  const tasks = item.tasks ?? [];
  const hasTasks = tasks.length > 0;
  const doneCount = tasks.filter((t) => t.isDone).length;
  const allTasksDone = hasTasks && doneCount === tasks.length;
  const aiProcessing =
    item.summaryStatus === 'processing' ||
    item.tasksStatus === 'processing' ||
    item.askAiStatus === 'processing' ||
    item.meetingDialogueStatus === 'processing';
  const translationProcessing = item.translationStatus === 'processing';
  const translationError = item.translationStatus === 'error';
  const meetingDialogueError = item.meetingDialogueStatus === 'failed';
  const aiError =
    item.summaryStatus === 'error' ||
    item.tasksStatus === 'error' ||
    item.askAiStatus === 'error' ||
    meetingDialogueError;
  const hasTranscriptPreview = Boolean(item.transcript?.trim());
  const showStatusPill =
    item.aiStatus === 'loading_model' ||
    item.aiStatus === 'processing' ||
    item.aiStatus === 'paused' ||
    item.aiStatus === 'resumable' ||
    item.aiStatus === 'cancelling' ||
    item.aiStatus === 'error' ||
    (item.aiStatus === 'idle' && !hasTranscriptPreview) ||
    aiProcessing ||
    aiError ||
    translationProcessing ||
    translationError;
  const showFolderStripe = Boolean(folderAccentColor);
  const isUnread = item.status === 'unread';

  const resolvedA11yHint =
    a11yHint === null
      ? undefined
      : (a11yHint ?? (onLongPress ? t('inbox.recordCardLongPressHint') : undefined));

  const baseContainerStyle = [
    cardStyle,
    {
      borderRadius: 16,
      padding: 0,
      overflow: 'hidden' as const,
      flexDirection: 'row' as const,
    },
  ];

  const cardBody = (
    <>
      {showFolderStripe && (
        <View
          style={{
            width: 4,
            alignSelf: 'stretch',
            backgroundColor: folderAccentColor,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      <View style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
            {item.isPinned && (
              <Pin size={14} color={color.accent.pin} strokeWidth={2} style={pinIconStyle} />
            )}
            {isUnread && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  marginRight: 8,
                  backgroundColor: color.accent.delete,
                  borderWidth: 2,
                  borderColor: color.background.card,
                }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            )}
            <Text
              style={[
                textPrimaryStyle,
                { flex: 1, fontSize: 15, fontWeight: isUnread ? '700' : '600' },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
          {showStatusPill && (
            <AiStatusPill
              aiStatus={item.aiStatus ?? 'done'}
              transcriptProgress={item.transcriptProgress}
              transcriptProgressLabel={item.transcriptProgressLabel}
              transcriptProgressSegments={item.transcriptProgressSegments}
              summaryStatus={item.summaryStatus}
              tasksStatus={item.tasksStatus}
              translationStatus={item.translationStatus}
              askAiStatus={item.askAiStatus}
              meetingDialogueStatus={item.meetingDialogueStatus}
              onPress={onStatusPress}
            />
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {hasAudio && <Clock size={14} color={color.icon.muted} strokeWidth={2} />}
            <Text style={[textSecondaryStyle, { marginLeft: hasAudio ? 4 : 0, fontSize: 12 }]}>
              {hasAudio && (
                <>
                  <Text style={[textSecondaryStyle, { fontSize: 12 }]}>{item.duration}</Text>
                  {'  '}
                </>
              )}
              {formatRelativeTime(item.createdAt, i18n.language)}
            </Text>
          </View>
          {hasTasks && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {allTasksDone ? (
                <CheckCircle2 size={14} color={color.accent.success} strokeWidth={2} />
              ) : (
                <>
                  <ListChecks size={14} color={color.icon.muted} strokeWidth={2} />
                  <Text style={[textSecondaryStyle, { fontSize: 12 }]}>
                    {doneCount}/{tasks.length}
                  </Text>
                </>
              )}
            </View>
          )}
          {item.classification && !item.folderId && (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: color.background.tertiary,
              }}
            >
              <Text style={[textSecondaryStyle, { fontSize: 11 }]}>
                {i18n.t(`classification.${item.classification}`)}
              </Text>
            </View>
          )}
        </View>
        {Boolean(item.transcript) && (
          <Text
            style={[textSecondaryStyle, { fontSize: 14, lineHeight: 20, marginBottom: 12 }]}
            numberOfLines={2}
          >
            {item.transcript}
          </Text>
        )}
        {hasTags && (
          <View className="flex-row flex-wrap gap-2">
            {item.tags!.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </View>
        )}
      </View>
    </>
  );

  if (hideAccessibilitySubtree) {
    return (
      <View
        style={baseContainerStyle}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {cardBody}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isUnread ? `${item.title}, ${t('inbox.recordUnreadA11y')}` : item.title}
      accessibilityHint={resolvedA11yHint}
      style={({ pressed }) => [
        ...baseContainerStyle,
        { opacity: pressed && !isSwiping ? 0.75 : 1 },
      ]}
      onPress={isSwiping ? undefined : onPress}
      onLongPress={isSwiping ? undefined : onLongPress}
      delayLongPress={350}
    >
      {cardBody}
    </Pressable>
  );
});
