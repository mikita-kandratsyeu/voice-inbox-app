import { List } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { AppBottomSheetContent, AppBottomSheetModal, SheetHeader } from '@/shared/ui';

import type { TocItem } from '../lib/generateTableOfContents';

type NoteDocumentTableOfContentsProps = {
  visible: boolean;
  color: Colors;
  items: TocItem[];
  onClose: () => void;
  onItemPress: (item: TocItem) => void;
};

export const NoteDocumentTableOfContents = React.memo(function NoteDocumentTableOfContents({
  visible,
  color,
  items,
  onClose,
  onItemPress,
}: NoteDocumentTableOfContentsProps) {
  const { t } = useTranslation();

  const handleItemPress = useCallback(
    (item: TocItem) => {
      hapticSelection();
      onItemPress(item);
      onClose();
    },
    [onClose, onItemPress],
  );

  const filteredItems = useMemo(() => {
    // Show only H1, H2, H3 for better readability
    return items.filter((item) => item.level <= 3);
  }, [items]);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent scrollable bottomPadding={32}>
        <SheetHeader
          title={t('recordingDetail.document.tocTitle')}
          subtitle={t('recordingDetail.document.tocSubtitle', { count: filteredItems.length })}
          color={color}
          icon={<List size={20} color={color.text.primary} strokeWidth={2} />}
          marginBottom={16}
          textAlign="left"
        />

        {filteredItems.map((item) => {
          const indentLevel = item.level - 1;
          const leftPadding = indentLevel * 16;

          return (
            <Pressable
              key={item.id}
              onPress={() => handleItemPress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${t('recordingDetail.document.tocHeadingLevel')} ${item.level}: ${item.title}`}
              style={({ pressed }) => ({
                paddingLeft: leftPadding,
                paddingRight: 12,
                paddingVertical: 12,
                borderRadius: 8,
                marginBottom: 4,
                backgroundColor: pressed ? color.background.secondary : 'transparent',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Level indicator */}
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor:
                      item.level === 1
                        ? color.accent.primary
                        : item.level === 2
                          ? color.text.secondary
                          : color.text.muted,
                  }}
                />

                {/* Title */}
                <Text
                  style={{
                    flex: 1,
                    fontSize: item.level === 1 ? 16 : item.level === 2 ? 15 : 14,
                    fontWeight: item.level === 1 ? '600' : item.level === 2 ? '500' : '400',
                    color:
                      item.level === 1
                        ? color.text.primary
                        : item.level === 2
                          ? color.text.primary
                          : color.text.secondary,
                    lineHeight: item.level === 1 ? 22 : 20,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {filteredItems.length === 0 && (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 14,
                color: color.text.secondary,
                textAlign: 'center',
              }}
            >
              {t('recordingDetail.document.tocEmpty')}
            </Text>
          </View>
        )}
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
});
