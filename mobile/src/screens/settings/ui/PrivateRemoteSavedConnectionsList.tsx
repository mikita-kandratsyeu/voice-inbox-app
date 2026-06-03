import { Check, ChevronDown, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  LayoutAnimation,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { PrivateRemoteProfile } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type PrivateRemoteSavedConnectionsListProps = {
  profiles: PrivateRemoteProfile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  color: Colors;
  disabled?: boolean;
};

export function PrivateRemoteSavedConnectionsList({
  profiles,
  activeProfileId,
  onSelectProfile,
  onDeleteProfile,
  color,
  disabled = false,
}: PrivateRemoteSavedConnectionsListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useSharedValue(-90);

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 0 : -90, {
      duration: 120,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [chevronRotation, expanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const collapsedSummary =
    profiles.length > 0
      ? t('aiSettings.privateProvider.profilesList.collapsedSummary', { count: profiles.length })
      : null;

  return (
    <View
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: color.border.default,
        opacity: disabled ? 0.55 : 1,
      }}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('aiSettings.privateProvider.profilesList.collapseA11y')
            : t('aiSettings.privateProvider.profilesList.expandA11y')
        }
        onPress={() => {
          hapticSelection();
          setExpanded((v) => {
            if (!v) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            return !v;
          });
        }}
        className="min-h-[48px] flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-80"
      >
        <View className="min-w-0 flex-1">
          <Text
            className="text-[13px] font-semibold leading-5"
            style={{ color: color.text.secondary }}
          >
            {t('aiSettings.privateProvider.profilesList.title')}
          </Text>
          {!expanded && collapsedSummary ? (
            <Text className="mt-0.5 text-[12px] leading-4" style={{ color: color.text.muted }}>
              {collapsedSummary}
            </Text>
          ) : null}
        </View>
        <Animated.View
          style={[
            chevronAnimatedStyle,
            {
              width: 28,
              height: 28,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <ChevronDown size={18} color={color.text.secondary} strokeWidth={2} />
        </Animated.View>
      </Pressable>
      {expanded ? (
        <View className="border-t px-4 pb-3 pt-2" style={{ borderTopColor: color.border.default }}>
          <View
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: color.border.default, maxHeight: 240 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {profiles.map((profile, index) => {
                const isActive = profile.id === activeProfileId;
                const isLast = index === profiles.length - 1;
                return (
                  <View
                    key={profile.id}
                    className="min-h-[48px] flex-row items-center px-4 py-3"
                    style={
                      !isLast
                        ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                        : undefined
                    }
                  >
                    <TouchableOpacity
                      onPress={() => {
                        onSelectProfile(profile.id);
                        hapticSelection();
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setExpanded(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      className="min-w-0 flex-1 flex-row items-center pr-2"
                    >
                      <View className="min-w-0 flex-1 pr-2">
                        <Text
                          className="text-[15px] leading-5"
                          style={{
                            color: isActive ? color.accent.primary : color.text.primary,
                            fontWeight: isActive ? '600' : '400',
                          }}
                          numberOfLines={2}
                        >
                          {profile.model}
                        </Text>
                        <Text
                          className="mt-0.5 text-[12px] leading-4"
                          style={{ color: color.text.muted }}
                          numberOfLines={1}
                        >
                          {profile.baseUrl}
                        </Text>
                      </View>
                      {isActive ? (
                        <View
                          className="h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: color.accent.primary }}
                        >
                          <Check size={14} color={color.icon.onAccent} strokeWidth={2.5} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          t('aiSettings.privateProvider.deleteConnectionTitle'),
                          t('aiSettings.privateProvider.deleteConnectionMessage'),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('common.delete'),
                              style: 'destructive',
                              onPress: () => onDeleteProfile(profile.id),
                            },
                          ],
                        )
                      }
                      className="ml-1 rounded-lg p-2"
                      accessibilityRole="button"
                      accessibilityLabel={t('aiSettings.privateProvider.deleteConnection')}
                    >
                      <Trash2 size={16} color={color.accent.delete} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}
