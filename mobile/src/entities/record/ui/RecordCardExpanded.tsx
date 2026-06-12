import { MenuView } from '@react-native-menu/menu';
import { CalendarDays, MoreHorizontal, Pin } from 'lucide-react-native';
import React, { memo, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import type { VoiceRecord } from '@/entities/record';
import { countMeetingParticipants } from '@/entities/record/lib/countMeetingParticipants';
import { getRecordCardChromeStyle } from '@/entities/record/lib/recordCardChrome';
import {
  countRecordCardTextFragments,
  formatExpandedCardDate,
  pickOpenTasksForCardPreview,
  resolveRecordCardNoteKind,
} from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';
import { HeaderIconButton, SwipeableCardContext } from '@/shared/ui';

import { AiStatusPill } from './AiStatusPill';
import { RecordCardLocationChip } from './RecordCardLocationChip';
import { RecordCardMetaStrip } from './RecordCardMetaStrip';
import { RecordCardOpenTasksPreview } from './RecordCardOpenTasksPreview';
import { RecordCardSourceChip } from './RecordCardSourceChip';
import { RecordCardTagsRow } from './RecordCardTagsRow';
import { RecordCardTypeBadges } from './RecordCardTypeBadges';

type RecordCardExpandedProps = {
  item: VoiceRecord;
  color: Colors;
  folderAccentColor?: string;
  folderName?: string;
  folderIconId?: string;
  hideCategoryLabel?: boolean;
  isArchivedView?: boolean;
  onPress: () => void;
  onStatusPress: () => void;
  onLongPress?: () => void;
  onPin?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onSelect?: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onOpenAllTasks?: () => void;
  a11yHint?: string | null;
  hideAccessibilitySubtree?: boolean;
};

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: '600' as const,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
};

export const RecordCardExpanded = memo(function RecordCardExpanded({
  item,
  color,
  folderAccentColor,
  folderName,
  folderIconId,
  hideCategoryLabel = false,
  isArchivedView = false,
  onPress,
  onStatusPress,
  onLongPress,
  onPin,
  onArchive,
  onUnarchive,
  onSelect,
  onShare,
  onRename,
  onDelete,
  onOpenAllTasks,
  a11yHint,
  hideAccessibilitySubtree = false,
}: RecordCardExpandedProps) {
  const { i18n, t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const { isSwiping } = useContext(SwipeableCardContext);

  const textPrimaryStyle = { color: color.text.primary };
  const textSecondaryStyle = { color: color.text.secondary };

  const noteKind = useMemo(() => resolveRecordCardNoteKind(item), [item]);
  const marksCount = item.recordingMarks?.length ?? 0;
  const openTaskPreview = useMemo(
    () => pickOpenTasksForCardPreview(item.tasks ?? []),
    [item.tasks],
  );
  const textFragmentCount = useMemo(() => {
    if (noteKind !== 'text') {
      return 0;
    }
    return countRecordCardTextFragments(item.transcript || item.summary, item.transcriptSegments);
  }, [item.summary, item.transcript, item.transcriptSegments, noteKind]);

  const hasAudio = Boolean(item.audioPath?.trim());
  const hasTranscriptPreview = Boolean(item.transcript?.trim());
  const previewText = item.summary || item.transcript;
  const hasPreview = Boolean(previewText?.trim());
  const tags = item.tags ?? [];
  const hasTags = tags.length > 0;
  const isUnread = item.status === 'unread';

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
    translationError ||
    item.summaryStatus === 'queued';

  const categoryLabel = hideCategoryLabel
    ? null
    : folderName
      ? folderName
      : item.classification && !item.folderId
        ? i18n.t(`classification.${item.classification}`)
        : null;
  const isFolderLabel = Boolean(folderName && item.folderId);
  const locationAccentColor = isFolderLabel
    ? folderAccentColor
    : (folderAccentColor ?? color.accent.primary);
  const showFolderStripe = Boolean(folderAccentColor);
  const showTypeBadges = noteKind !== 'voice' || marksCount > 0;
  const hasSummaryPreview = Boolean(item.summary?.trim());
  const showSourceChip =
    noteKind !== 'text' && (hasTranscriptPreview || (!hasTranscriptPreview && hasSummaryPreview));
  const sourceChipLabel = hasTranscriptPreview
    ? t('inbox.cardLayout.sourceText')
    : t('inbox.cardLayout.hasSummary');
  const meetingParticipantCount = useMemo(
    () =>
      noteKind === 'meeting'
        ? countMeetingParticipants(item.meetingDialogue, item.meetingSpeakerLabels)
        : 0,
    [item.meetingDialogue, item.meetingSpeakerLabels, noteKind],
  );
  const showMetaStrip =
    hasAudio || noteKind === 'text' || (item.tasks?.length ?? 0) > 0 || meetingParticipantCount > 0;
  const showFooter = hasTags || categoryLabel != null;

  const menuActions = useMemo(() => {
    const titleColor = color.text.primary;
    const showAllTasks = Boolean(onOpenAllTasks);

    const pinAction: NativeMenuAction | null = onPin
      ? {
          id: 'togglePin',
          title: item.isPinned ? t('recordActions.unpin') : t('recordActions.pin'),
          titleColor,
          image: 'pin',
          imageColor: item.isPinned ? color.accent.pin : titleColor,
        }
      : null;

    const renameAction: NativeMenuAction | null = onRename
      ? {
          id: 'rename',
          title: t('recordActions.rename'),
          titleColor,
          image: 'pencil',
          imageColor: titleColor,
        }
      : null;

    const restPrimary: NativeMenuAction[] = [];

    if (isArchivedView && onUnarchive) {
      restPrimary.push({
        id: 'unarchive',
        title: t('recordActions.unarchive'),
        titleColor,
        image: 'arrow.uturn.backward',
        imageColor: titleColor,
      });
    } else if (!isArchivedView && onArchive) {
      restPrimary.push({
        id: 'archive',
        title: t('recordActions.archive'),
        titleColor,
        image: 'archivebox',
        imageColor: titleColor,
      });
    }
    if (onShare) {
      restPrimary.push({
        id: 'share',
        title: t('share.share'),
        titleColor,
        image: 'square.and.arrow.up',
        imageColor: titleColor,
      });
    }

    const pinRenameActions: NativeMenuAction[] = [];
    if (pinAction) {
      pinRenameActions.push(pinAction);
    }
    if (renameAction) {
      pinRenameActions.push(renameAction);
    }

    if (
      !pinAction &&
      !renameAction &&
      restPrimary.length === 0 &&
      !onSelect &&
      !showAllTasks &&
      !onDelete
    ) {
      return [];
    }

    const actions: NativeMenuAction[] = [];

    if (showAllTasks) {
      actions.push({
        id: 'allTasksForNote',
        title: t('recordingDetail.allTasksForNote'),
        titleColor,
        image: 'checklist',
        imageColor: titleColor,
      });

      if (pinRenameActions.length > 0) {
        actions.push(inlineNativeMenuSection('pinRenameSection', titleColor, pinRenameActions));
      }
    } else {
      if (pinAction) {
        actions.push(pinAction);
      }

      if (renameAction) {
        actions.push(renameAction);
      }
    }

    const tailActions: NativeMenuAction[] = [...restPrimary];
    if (onSelect) {
      tailActions.push({
        id: 'select',
        title: t('inbox.menuSelectNotes'),
        titleColor,
        image: 'checkmark.circle',
        imageColor: titleColor,
      });
    }

    if (tailActions.length > 0) {
      const needsSectionBeforeTail = showAllTasks || pinAction || renameAction;
      if (needsSectionBeforeTail) {
        actions.push(inlineNativeMenuSection('tailSection', titleColor, tailActions));
      } else {
        actions.push(...tailActions);
      }
    }

    if (onDelete) {
      actions.push(
        inlineNativeMenuSection('deleteSection', titleColor, [
          {
            id: 'delete',
            title: t('recordActions.delete'),
            titleColor: color.accent.delete,
            image: 'trash',
            imageColor: color.accent.delete,
            attributes: { destructive: true },
          },
        ]),
      );
    }

    return actions;
  }, [
    color.accent.delete,
    color.accent.pin,
    color.text.primary,
    isArchivedView,
    item.isPinned,
    onArchive,
    onDelete,
    onOpenAllTasks,
    onPin,
    onRename,
    onSelect,
    onShare,
    onUnarchive,
    t,
  ]);

  const resolvedA11yHint =
    a11yHint === null
      ? undefined
      : (a11yHint ?? (onLongPress ? t('inbox.recordCardLongPressHint') : undefined));

  const baseContainerStyle = [
    getRecordCardChromeStyle(color),
    {
      alignSelf: 'stretch' as const,
      borderRadius: 16,
      padding: 0,
      overflow: 'hidden' as const,
      flexDirection: 'row' as const,
    },
  ];

  const cardBody = (
    <>
      {showFolderStripe ? (
        <View
          style={{
            width: 4,
            alignSelf: 'stretch',
            backgroundColor: folderAccentColor,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      <View style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={13} color={color.icon.muted} strokeWidth={2} />
              <Text style={[textSecondaryStyle, { fontSize: 12 }]} numberOfLines={2}>
                {formatExpandedCardDate(item.createdAt, i18n.language, t)}
              </Text>
            </View>
            {showSourceChip ? <RecordCardSourceChip label={sourceChipLabel} color={color} /> : null}
            {showTypeBadges ? (
              <RecordCardTypeBadges
                noteKind={noteKind}
                marksCount={marksCount}
                color={color}
                embedded
              />
            ) : null}
          </View>
          {menuActions.length > 0 && !hideAccessibilitySubtree ? (
            <MenuView
              key={`record-expanded-menu-${item.id}-${theme}`}
              title=""
              themeVariant={isDark ? 'dark' : 'light'}
              shouldOpenOnLongPress={false}
              actions={menuActions}
              onPressAction={({ nativeEvent }) => {
                const id = nativeEvent.event;
                if (id === 'allTasksForNote') onOpenAllTasks?.();
                if (id === 'select') onSelect?.();
                if (id === 'togglePin') onPin?.();
                if (id === 'rename') onRename?.();
                if (id === 'archive') onArchive?.();
                if (id === 'unarchive') onUnarchive?.();
                if (id === 'share') onShare?.();
                if (id === 'delete') onDelete?.();
              }}
            >
              <HeaderIconButton
                iconOnly
                variant="icon"
                size="md"
                color={color}
                icon={<MoreHorizontal size={18} color={color.icon.muted} strokeWidth={2.2} />}
                onPress={() => {}}
                containerStyle={{ backgroundColor: 'transparent' }}
                accessibilityLabel={t('inbox.cardLayout.noteMenu')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
            </MenuView>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', minWidth: 0 }}>
            {item.isPinned ? (
              <Pin
                size={16}
                color={color.accent.pin}
                strokeWidth={2}
                style={{ marginRight: 6, marginTop: 3 }}
              />
            ) : null}
            {isUnread ? (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  marginRight: 8,
                  marginTop: 5,
                  backgroundColor: color.accent.delete,
                  borderWidth: 2,
                  borderColor: color.background.card,
                }}
              />
            ) : null}
            <Text
              style={[
                textPrimaryStyle,
                {
                  flex: 1,
                  fontSize: 18,
                  lineHeight: 24,
                  fontWeight: isUnread ? '700' : '600',
                },
              ]}
              numberOfLines={3}
            >
              {item.title}
            </Text>
          </View>
          {showStatusPill ? (
            <View style={{ flexShrink: 0, maxWidth: '46%' }}>
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
            </View>
          ) : null}
        </View>

        {hasPreview ? (
          <Text style={[textSecondaryStyle, { fontSize: 14, lineHeight: 21 }]} numberOfLines={4}>
            {previewText}
          </Text>
        ) : null}

        {showMetaStrip ? (
          <RecordCardMetaStrip
            noteKind={noteKind}
            duration={item.duration}
            color={color}
            textFragmentCount={textFragmentCount}
            tasks={item.tasks}
            meetingParticipantCount={meetingParticipantCount}
          />
        ) : null}

        <RecordCardOpenTasksPreview tasks={openTaskPreview} color={color} />

        {showFooter ? (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: color.border.default,
                marginTop: 14,
                marginBottom: 12,
              }}
            />
            <View style={{ gap: 10 }}>
              {hasTags ? (
                <View style={{ minWidth: 0 }}>
                  <Text style={[sectionTitleStyle, { color: color.text.muted, marginBottom: 8 }]}>
                    {t('inbox.cardLayout.tagsSectionTitle')}
                  </Text>
                  <RecordCardTagsRow tags={tags} color={color} variant="full" />
                </View>
              ) : null}
              {categoryLabel ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 6,
                  }}
                >
                  <RecordCardLocationChip
                    label={categoryLabel}
                    color={color}
                    accentColor={locationAccentColor}
                    folderIconId={isFolderLabel ? folderIconId : undefined}
                  />
                </View>
              ) : null}
            </View>
          </>
        ) : null}
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
