import type { FlashListRef } from '@shopify/flash-list';
import React, { memo } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { RecordCard } from '@/entities/record';
import type { BatchSelectState } from '@/features/batch-select';
import { BatchCheckbox } from '@/features/batch-select';
import type { Colors } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';
import { SectionHeader, SwipeableCard } from '@/shared/ui';

import type { FlattenedItem } from '../lib/inboxScreenTypes';

export type InboxScreenListItemProps = {
  item: FlattenedItem;
  color: Colors;
  batchSelect: BatchSelectState;
  effectiveActiveFolderId: string | null;
  isPrivateMode: boolean;
  folderColorById: Map<string, string>;
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
};

function InboxScreenListItemInner({
  item,
  color,
  batchSelect,
  effectiveActiveFolderId,
  isPrivateMode,
  folderColorById,
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
}: InboxScreenListItemProps) {
  if (item.type === 'header') {
    return <SectionHeader title={item.title} isFirst={item.isFirst} />;
  }

  const isSelected = batchSelect.selectedIds.has(item.item.id);
  const folderStripeColor =
    !effectiveActiveFolderId && !isPrivateMode && item.item.folderId
      ? resolveDisplayFolderColor(folderColorById.get(item.item.folderId), isProActive)
      : undefined;

  if (batchSelect.isSelectMode) {
    const toggle = () => batchSelect.toggleItem(item.item.id);
    return (
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityLabel={item.item.title}
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
          <RecordCard
            item={item.item}
            color={color}
            folderAccentColor={folderStripeColor}
            onPress={toggle}
            onStatusPress={toggle}
            onLongPress={toggle}
            a11yHint={null}
            hideAccessibilitySubtree
          />
        </View>
      </Pressable>
    );
  }

  return (
    <SwipeableCard
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
      <RecordCard
        item={item.item}
        color={color}
        folderAccentColor={folderStripeColor}
        onPress={() => onRecordPress(item.item)}
        onStatusPress={() => onStatusPress(item.item)}
        onLongPress={() => onRecordLongPress(item.item)}
      />
    </SwipeableCard>
  );
}

export const InboxScreenListItem = memo(InboxScreenListItemInner);
