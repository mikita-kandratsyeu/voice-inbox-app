import { MenuView } from '@react-native-menu/menu';
import { CalendarDays, MoreHorizontal, Pin } from 'lucide-react-native';
import React, { memo, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, useWindowDimensions, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import type { VoiceRecord } from '@/entities/record';
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
  a11yHint?: string | null;
  hideAccessibilitySubtree?: boolean;
};

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: '600' as const,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
};

const COMPACT_CARD_LAYOUT_MAX_WIDTH = 420;

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
  a11yHint,
  hideAccessibilitySubtree = false,
}: RecordCardExpandedProps) {
  const { i18n, t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const compactLayout = windowWidth < COMPACT_CARD_LAYOUT_MAX_WIDTH;
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
    translationError;

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
    noteKind === 'text'
      ? hasTranscriptPreview || hasSummaryPreview
      : hasTranscriptPreview || (!hasTranscriptPreview && hasSummaryPreview);
  const sourceChipLabel =
    noteKind === 'text'
      ? t('inbox.cardLayout.noteTypeText')
      : hasTranscriptPreview
        ? t('inbox.cardLayout.sourceText')
        : t('inbox.cardLayout.hasSummary');
  const showMetaStrip = hasAudio || noteKind === 'text' || (item.tasks?.length ?? 0) > 0;
  const showFooter = hasTags || categoryLabel != null || showSourceChip;

  const menuActions = useMemo(() => {
    const titleColor = color.text.primary;
    const primary: NativeMenuAction[] = [];

    if (onPin) {
      primary.push({
        id: 'togglePin',
        title: item.isPinned ? t('recordActions.unpin') : t('recordActions.pin'),
        titleColor,
        image: 'pin',
        imageColor: item.isPinned ? color.accent.pin : titleColor,
      });
    }
    if (isArchivedView && onUnarchive) {
      primary.push({
        id: 'unarchive',
        title: t('recordActions.unarchive'),
        titleColor,
        image: 'arrow.uturn.backward',
        imageColor: titleColor,
      });
    } else if (!isArchivedView && onArchive) {
      primary.push({
        id: 'archive',
        title: t('recordActions.archive'),
        titleColor,
        image: 'archivebox',
        imageColor: titleColor,
      });
    }

    if (primary.length === 0 && !onSelect) {
      return [];
    }

    if (!onSelect) {
      return primary;
    }

    return [
      ...primary,
      inlineNativeMenuSection('selectSection', titleColor, [
        {
          id: 'select',
          title: t('inbox.menuSelectNotes'),
          titleColor,
          image: 'checkmark.circle',
          imageColor: titleColor,
        },
      ]),
    ];
  }, [
    color.accent.pin,
    color.text.primary,
    isArchivedView,
    item.isPinned,
    onArchive,
    onPin,
    onSelect,
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
                if (id === 'select') onSelect?.();
                if (id === 'togglePin') onPin?.();
                if (id === 'archive') onArchive?.();
                if (id === 'unarchive') onUnarchive?.();
              }}
            >
              <HeaderIconButton
                iconOnly
                variant="icon"
                size="md"
                color={color}
                icon={<MoreHorizontal size={18} color={color.icon.muted} strokeWidth={2.2} />}
                onPress={() => {}}
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
            <View
              style={
                compactLayout && hasTags && (categoryLabel != null || showSourceChip)
                  ? { gap: 10 }
                  : {
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                    }
              }
            >
              {hasTags ? (
                <View
                  style={{
                    flex:
                      compactLayout && (categoryLabel != null || showSourceChip) ? undefined : 1,
                    minWidth: 0,
                  }}
                >
                  <Text style={[sectionTitleStyle, { color: color.text.muted, marginBottom: 8 }]}>
                    {t('inbox.cardLayout.tagsSectionTitle')}
                  </Text>
                  <RecordCardTagsRow tags={tags} color={color} variant="full" />
                </View>
              ) : compactLayout && (categoryLabel != null || showSourceChip) ? null : (
                <View style={{ flex: 1 }} />
              )}
              {showSourceChip || categoryLabel ? (
                <View
                  style={[
                    {
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 6,
                      flexShrink: 0,
                    },
                    compactLayout && hasTags ? { alignSelf: 'flex-start' } : null,
                  ]}
                >
                  {categoryLabel ? (
                    <RecordCardLocationChip
                      label={categoryLabel}
                      color={color}
                      accentColor={locationAccentColor}
                      folderIconId={isFolderLabel ? folderIconId : undefined}
                    />
                  ) : null}
                  {showSourceChip ? (
                    <RecordCardSourceChip label={sourceChipLabel} color={color} />
                  ) : null}
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
