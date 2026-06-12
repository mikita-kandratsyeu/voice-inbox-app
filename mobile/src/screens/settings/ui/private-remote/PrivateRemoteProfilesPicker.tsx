import { Check, Server, Trash2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';

import type { PrivateRemoteProfile } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { SettingsRow } from '@/shared/ui';

import { PrivateRemotePickerSheetFrame } from './PrivateRemotePickerSheetFrame';
import { PrivateRemoteSheetPickerRow } from './PrivateRemoteSheetPickerRow';

type PrivateRemoteProfilesPickerProps = {
  profiles: PrivateRemoteProfile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  color: Colors;
  disabled?: boolean;
};

export function PrivateRemoteProfilesPicker({
  profiles,
  activeProfileId,
  onSelectProfile,
  onDeleteProfile,
  color,
  disabled = false,
}: PrivateRemoteProfilesPickerProps) {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [presentRequestKey, setPresentRequestKey] = useState(0);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const openSheet = useCallback(() => {
    if (disabled) return;
    hapticSelection();
    setPresentRequestKey((key) => key + 1);
    setSheetVisible((current) => {
      if (!current) return true;
      requestAnimationFrame(() => setSheetVisible(true));
      return false;
    });
  }, [disabled]);

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const pickProfile = useCallback(
    (id: string) => {
      onSelectProfile(id);
      closeSheet();
    },
    [closeSheet, onSelectProfile],
  );

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert(
        t('aiSettings.privateProvider.deleteConnectionTitle'),
        t('aiSettings.privateProvider.deleteConnectionMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => onDeleteProfile(id),
          },
        ],
      );
    },
    [onDeleteProfile, t],
  );

  const triggerLabel =
    activeProfile?.model.trim() ||
    t('aiSettings.privateProvider.profilesList.collapsedSummary', { count: profiles.length });
  const triggerSubtitle = activeProfile?.baseUrl;

  return (
    <>
      <Text className="mb-2 text-[13px] font-semibold" style={{ color: color.text.secondary }}>
        {t('aiSettings.privateProvider.profilesList.title')}
      </Text>
      <View
        className="overflow-hidden rounded-2xl"
        style={{
          borderWidth: 1,
          borderColor: color.border.default,
          opacity: disabled ? 0.55 : 1,
        }}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <SettingsRow
          label={triggerLabel}
          subtitle={triggerSubtitle}
          onPress={openSheet}
          leftIcon={<Server size={20} color={color.accent.primary} strokeWidth={2} />}
          showChevron
          isFirst
          isLast
        />
      </View>

      <PrivateRemotePickerSheetFrame
        visible={sheetVisible}
        presentRequestKey={presentRequestKey}
        title={t('aiSettings.privateProvider.profilesList.sheetTitle')}
        subtitle={t('aiSettings.privateProvider.profilesList.sheetSubtitle')}
        color={color}
        onClose={closeSheet}
      >
        {profiles.map((profile, index) => {
          const isLast = index === profiles.length - 1;
          const isActive = profile.id === activeProfileId;
          return (
            <PrivateRemoteSheetPickerRow
              key={profile.id}
              label={profile.model}
              subtitle={profile.baseUrl}
              color={color}
              icon={Server}
              selected={isActive}
              showSelectionCheck={false}
              isLast={isLast}
              onPress={() => pickProfile(profile.id)}
              trailing={
                <View className="flex-row items-center gap-2">
                  {isActive ? (
                    <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
                  ) : null}
                  <Pressable
                    onPress={() => confirmDelete(profile.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('aiSettings.privateProvider.deleteConnection')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="rounded-lg p-1.5"
                  >
                    <Trash2 size={18} color={color.accent.delete} strokeWidth={2} />
                  </Pressable>
                </View>
              }
            />
          );
        })}
      </PrivateRemotePickerSheetFrame>
    </>
  );
}
