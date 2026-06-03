import { Check, ChevronDown, RefreshCw } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { listPrivateRemoteModels } from '@/shared/lib/ai-core/privateRemoteProvider';

type PrivateRemoteModelListProps = {
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  color: Colors;
  /** Bump to refetch (e.g. after URL change). */
  refreshNonce?: number;
};

export function PrivateRemoteModelList({
  baseUrl,
  apiKey,
  selectedModel,
  onSelectModel,
  color,
  refreshNonce = 0,
}: PrivateRemoteModelListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
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

  const loadModels = useCallback(async () => {
    const trimmedUrl = baseUrl.trim();
    if (!trimmedUrl) {
      setModels([]);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    const result = await listPrivateRemoteModels({
      privateRemoteBaseUrl: trimmedUrl,
      privateRemoteApiKey: apiKey,
    });

    if (requestId !== requestIdRef.current) return;

    setIsLoading(false);
    if (result.ok) {
      setModels(result.models);
      setError(null);
      return;
    }
    setModels([]);
    setError(result.error);
  }, [apiKey, baseUrl]);

  useEffect(() => {
    void loadModels();
  }, [loadModels, refreshNonce]);

  const trimmedSelected = selectedModel.trim();
  const collapsedSummary =
    models.length > 0
      ? t('aiSettings.privateProvider.modelList.collapsedSummary', { count: models.length })
      : isLoading
        ? t('aiSettings.privateProvider.modelList.loadingSummary')
        : error
          ? t('aiSettings.privateProvider.modelList.errorSummary')
          : null;

  return (
    <View
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: color.border.default }}
    >
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={
            expanded
              ? t('aiSettings.privateProvider.modelList.collapseA11y')
              : t('aiSettings.privateProvider.modelList.expandA11y')
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
          className="min-h-[48px] min-w-0 flex-1 flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-80"
        >
          <View className="min-w-0 flex-1">
            <Text
              className="text-[13px] font-semibold leading-5"
              style={{ color: color.text.secondary }}
            >
              {t('aiSettings.privateProvider.modelList.title')}
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
        <TouchableOpacity
          onPress={() => {
            void loadModels();
          }}
          disabled={isLoading || baseUrl.trim().length === 0}
          className="mr-3 h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: color.border.default,
            opacity: isLoading || baseUrl.trim().length === 0 ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('aiSettings.privateProvider.modelList.refresh')}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={color.text.muted} />
          ) : (
            <RefreshCw size={18} color={color.text.secondary} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>
      {expanded ? (
        <View className="border-t px-4 pb-3 pt-2" style={{ borderTopColor: color.border.default }}>
          {error ? (
            <Text className="mb-3 text-[13px] leading-5" style={{ color: color.accent.delete }}>
              {error}
            </Text>
          ) : null}
          {models.length > 0 ? (
            <View
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: color.border.default, maxHeight: 240 }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                {models.map((modelId, index) => {
                  const isSelected = modelId === trimmedSelected;
                  const isLast = index === models.length - 1;
                  return (
                    <TouchableOpacity
                      key={modelId}
                      onPress={() => {
                        onSelectModel(modelId);
                        hapticSelection();
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setExpanded(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      className="min-h-[48px] flex-row items-center justify-between px-4 py-3"
                      style={
                        !isLast
                          ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                          : undefined
                      }
                    >
                      <Text
                        className="min-w-0 flex-1 pr-3 text-[15px] leading-5"
                        style={{
                          color: isSelected ? color.accent.primary : color.text.primary,
                          fontWeight: isSelected ? '600' : '400',
                        }}
                        numberOfLines={2}
                      >
                        {modelId}
                      </Text>
                      {isSelected ? (
                        <View
                          className="h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: color.accent.primary }}
                        >
                          <Check size={14} color={color.icon.onAccent} strokeWidth={2.5} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : !isLoading && !error && baseUrl.trim().length > 0 ? (
            <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
              {t('aiSettings.privateProvider.modelList.empty')}
            </Text>
          ) : isLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={color.text.muted} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
