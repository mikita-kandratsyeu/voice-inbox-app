import { MenuView } from '@react-native-menu/menu';
import { ChevronLeft, MoreVertical, Pin, Share2 } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { Button } from '@/shared/ui';

type RecordingDetailHeaderProps = {
  record: VoiceRecord;
  color: Colors;
  onBack: () => void;
  onTogglePin: () => void;
  onShare: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export const RecordingDetailHeader = ({
  record,
  color,
  onBack,
  onTogglePin,
  onShare,
  onRename,
  onDelete,
}: RecordingDetailHeaderProps) => {
  const insets = useSafeAreaInsets();
  const iconBtnBg = { backgroundColor: color.background.tertiary };
  const pinActiveStyle = { backgroundColor: color.accent.primary + '1A' };

  return (
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
        onPress={onBack}
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
              color={record.isPinned ? color.accent.pin : color.icon.muted}
              strokeWidth={2.2}
              fill={record.isPinned ? color.accent.pin : 'transparent'}
            />
          }
          color={color}
          onPress={onTogglePin}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          containerStyle={record.isPinned ? pinActiveStyle : iconBtnBg}
        />
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<Share2 size={18} color={color.icon.muted} strokeWidth={2.2} />}
          color={color}
          onPress={onShare}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
        <MenuView
          title=""
          shouldOpenOnLongPress={false}
          onPressAction={({ nativeEvent }) => {
            if (nativeEvent.event === 'rename') onRename();
            if (nativeEvent.event === 'delete') onDelete();
          }}
          actions={[
            {
              id: 'rename',
              title: 'Rename',
              image: 'pencil',
              imageColor: color.text.primary,
            },
            {
              id: 'delete',
              title: 'Delete',
              image: 'trash',
              imageColor: color.accent.delete,
              attributes: { destructive: true },
            },
          ]}
        >
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<MoreVertical size={18} color={color.icon.muted} strokeWidth={2.2} />}
            color={color}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        </MenuView>
      </View>
    </View>
  );
};
