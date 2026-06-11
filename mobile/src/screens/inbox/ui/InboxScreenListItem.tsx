import type { FlashListRef } from '@shopify/flash-list';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutAnimation, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { VoiceRecord } from '@/entities/record';
import { RecordCard, RecordCardExpanded } from '@/entities/record';
import type { BatchSelectState } from '@/features/batch-select';
import { BatchCheckbox } from '@/features/batch-select';
import { InboxBannerAd } from '@/features/inbox-banner';
import type { InboxCardLayout } from '@/features/inbox-card-layout';
import type { Colors } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';
import { SectionHeader, SwipeableCard } from '@/shared/ui';

import { inboxCardLayoutReanimatedTransition } from '../lib/inboxCardLayoutTransition';
import type { FlattenedItem } from '../lib/inboxScreenTypes';

const EXPANDED_CARD_MAX_HEIGHT = 560;

const RECORD_CARD_SHELL_STYLE = {
  marginHorizontal: 16,
  marginBottom: 16,
  alignSelf: 'stretch' as const,
  overflow: 'hidden' as const,
};

export type InboxScreenListItemProps = {
  item: FlattenedItem;
  color: Colors;
  bannerMaxWidth: number;
  batchSelect: BatchSelectState;
  cardLayout: InboxCardLayout;
  effectiveActiveFolderId: string | null;
  foldersEnabled: boolean;
  folderColorById: Map<string, string>;
  folderIconById: Map<string, string>;
  folderNameById: Map<string, string>;
  isProActive: boolean;
  isArchivedView: boolean;
  dismissSwipeHint: () => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  togglePin: (id: string) => void;
  listRef: React.RefObject<FlashListRef<FlattenedItem> | null>;
  onRecordPress: (item: VoiceRecord) => void;
  onStatusPress: (item: VoiceRecord) => void;
  onRecordLongPress: (item: VoiceRecord) => void;
  onRecordShare: (item: VoiceRecord) => void;
  onRecordRename: (item: VoiceRecord) => void;
  onOpenAllTasksForNote: (recordId: string) => void;
};

function InboxScreenListItemInner({
  item,
  color,
  bannerMaxWidth,
  batchSelect,
  cardLayout,
  effectiveActiveFolderId,
  foldersEnabled,
  folderColorById,
  folderIconById,
  folderNameById,
  isProActive,
  isArchivedView,
  dismissSwipeHint,
  archiveRecord,
  unarchiveRecord,
  togglePin,
  listRef,
  onRecordPress,
  onStatusPress,
  onRecordLongPress,
  onRecordShare,
  onRecordRename,
  onOpenAllTasksForNote,
}: InboxScreenListItemProps) {
  const { t } = useTranslation();

  if (item.type === 'header') {
    return <SectionHeader title={item.title} isFirst={item.isFirst} />;
  }

  if (item.type === 'banner_card') {
    return <InboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} variant="card" />;
  }

  const isExpandedLayout = cardLayout === 'expanded';
  const isSelected = batchSelect.selectedIds.has(item.item.id);
  const recordA11yLabel =
    item.item.status === 'unread'
      ? `${item.item.title}, ${t('inbox.recordUnreadA11y')}`
      : item.item.title;
  const folderStripeColor =
    !effectiveActiveFolderId && foldersEnabled && item.item.folderId
      ? resolveDisplayFolderColor(folderColorById.get(item.item.folderId), isProActive)
      : undefined;
  const folderName =
    foldersEnabled && item.item.folderId ? folderNameById.get(item.item.folderId) : undefined;
  const folderIconId =
    foldersEnabled && item.item.folderId ? folderIconById.get(item.item.folderId) : undefined;

  const renderRecordCard = ({
    onPress,
    onStatusPress,
    onLongPress,
    hideAccessibilitySubtree,
    a11yHint,
  }: {
    onPress: () => void;
    onStatusPress: () => void;
    onLongPress?: () => void;
    hideAccessibilitySubtree?: boolean;
    a11yHint?: string | null;
  }) => {
    if (isExpandedLayout) {
      return (
        <RecordCardExpanded
          item={item.item}
          color={color}
          folderAccentColor={folderStripeColor}
          folderName={folderName}
          folderIconId={folderIconId}
          hideCategoryLabel={Boolean(effectiveActiveFolderId)}
          isArchivedView={isArchivedView}
          onPress={onPress}
          onStatusPress={onStatusPress}
          onLongPress={onLongPress}
          onPin={() => togglePin(item.item.id)}
          onRename={() => onRecordRename(item.item)}
          onArchive={isArchivedView ? undefined : () => archiveRecord(item.item.id)}
          onUnarchive={isArchivedView ? () => unarchiveRecord(item.item.id) : undefined}
          onSelect={() => onRecordLongPress(item.item)}
          onShare={() => onRecordShare(item.item)}
          onOpenAllTasks={
            !isArchivedView && (item.item.tasks?.length ?? 0) > 0
              ? () => onOpenAllTasksForNote(item.item.id)
              : undefined
          }
          a11yHint={a11yHint}
          hideAccessibilitySubtree={hideAccessibilitySubtree}
        />
      );
    }

    return (
      <RecordCard
        item={item.item}
        color={color}
        folderAccentColor={folderStripeColor}
        onPress={onPress}
        onStatusPress={onStatusPress}
        onLongPress={onLongPress}
        a11yHint={a11yHint}
        hideAccessibilitySubtree={hideAccessibilitySubtree}
      />
    );
  };

  if (batchSelect.isSelectMode) {
    const toggle = () => batchSelect.toggleItem(item.item.id);
    return (
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityLabel={recordA11yLabel}
        accessibilityState={{ checked: isSelected }}
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{ paddingRight: 10, alignSelf: 'stretch', justifyContent: 'center' }}
          pointerEvents="none"
        >
          <BatchCheckbox isSelected={isSelected} color={color} size={22} />
        </View>
        <View style={{ flex: 1 }} pointerEvents="box-none">
          <Animated.View layout={inboxCardLayoutReanimatedTransition}>
            {renderRecordCard({
              onPress: toggle,
              onStatusPress: toggle,
              onLongPress: toggle,
              a11yHint: null,
              hideAccessibilitySubtree: true,
            })}
          </Animated.View>
        </View>
      </Pressable>
    );
  }

  const cardPressHandlers = {
    onPress: () => onRecordPress(item.item),
    onStatusPress: () => onStatusPress(item.item),
    onLongPress: () => onRecordLongPress(item.item),
  };

  return (
    <Animated.View
      layout={inboxCardLayoutReanimatedTransition}
      style={[
        RECORD_CARD_SHELL_STYLE,
        isExpandedLayout ? { maxHeight: EXPANDED_CARD_MAX_HEIGHT } : null,
      ]}
    >
      {isExpandedLayout ? (
        renderRecordCard(cardPressHandlers)
      ) : (
        <SwipeableCard
          embedded
          isPinned={item.item.isPinned}
          leftAction={isArchivedView ? 'unarchive' : 'archive'}
          onLeftAction={() => {
            dismissSwipeHint();
            listRef.current?.prepareForLayoutAnimationRender();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            isArchivedView ? unarchiveRecord(item.item.id) : archiveRecord(item.item.id);
          }}
          onPin={() => {
            dismissSwipeHint();
            togglePin(item.item.id);
          }}
        >
          {renderRecordCard(cardPressHandlers)}
        </SwipeableCard>
      )}
    </Animated.View>
  );
}

export const InboxScreenListItem = memo(InboxScreenListItemInner);
