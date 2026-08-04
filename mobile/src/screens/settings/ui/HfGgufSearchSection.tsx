import { Download, Search } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { LocalAiModelId, WhisperModelStatus } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import {
  buildCustomEntryFromSearchResult,
  buildCustomLocalAiModelId,
  type HfGgufSearchResult,
  searchHfGgufModels,
} from '@/features/hf-model-search';
import type { Colors } from '@/shared/config';
import { formatFileSize } from '@/shared/lib/whisper';

type HfGgufSearchSectionProps = {
  color: Colors;
  hasActiveDownload: boolean;
  localLlmModelStatuses: Partial<Record<LocalAiModelId, WhisperModelStatus>>;
  onInstall: (modelId: LocalAiModelId, sizeMb: number) => void;
  onSelect: (modelId: LocalAiModelId) => void;
};

export const HfGgufSearchSection = ({
  color,
  hasActiveDownload,
  localLlmModelStatuses,
  onInstall,
  onSelect,
}: HfGgufSearchSectionProps) => {
  const { t } = useTranslation();
  const addCustomLocalAiModel = useSettingsStore((s) => s.addCustomLocalAiModel);
  const customLocalAiModels = useSettingsStore((s) => s.customLocalAiModels);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HfGgufSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError(t('aiModels.hfSearchMinChars'));
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const found = await searchHfGgufModels(trimmed, { limit: 12 });
      setResults(found);
      if (found.length === 0) {
        setSearchError(t('aiModels.hfSearchEmpty'));
      }
    } catch {
      setResults([]);
      setSearchError(t('aiModels.hfSearchFailed'));
    } finally {
      setIsSearching(false);
    }
  }, [query, t]);

  const handleInstall = useCallback(
    (result: HfGgufSearchResult) => {
      if (hasActiveDownload) {
        Alert.alert(
          t('aiModels.localDownloadBlockedTitle'),
          t('aiModels.localDownloadBlockedBody'),
        );
        return;
      }

      const modelId = buildCustomLocalAiModelId(result.repoId, result.fileName);
      const status = localLlmModelStatuses[modelId];
      if (status === 'downloaded') {
        onSelect(modelId);
        return;
      }
      if (status === 'downloading') {
        return;
      }

      const entry = buildCustomEntryFromSearchResult(result);
      addCustomLocalAiModel(entry);
      onInstall(modelId, entry.sizeMb);
    },
    [addCustomLocalAiModel, hasActiveDownload, localLlmModelStatuses, onInstall, onSelect, t],
  );

  const installedIds = new Set(customLocalAiModels.map((m) => m.id));

  return (
    <View className="mt-6">
      <Text
        className="mb-1 px-1 text-xs font-semibold uppercase tracking-widest"
        style={{ color: color.text.secondary }}
      >
        {t('aiModels.hfSearchSectionTitle')}
      </Text>
      <Text className="mb-3 px-1 text-[13px] leading-5" style={{ color: color.text.muted }}>
        {t('aiModels.hfSearchSectionDescription')}
      </Text>

      <View
        className="mb-3 flex-row items-center gap-2 rounded-2xl px-3 py-2"
        style={{
          backgroundColor: color.background.card,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        <Search size={18} color={color.text.muted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('aiModels.hfSearchPlaceholder')}
          placeholderTextColor={color.text.muted}
          returnKeyType="search"
          onSubmitEditing={() => void handleSearch()}
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 py-1 text-[15px]"
          style={{ color: color.text.primary }}
          accessibilityLabel={t('aiModels.hfSearchPlaceholder')}
        />
        <TouchableOpacity
          onPress={() => void handleSearch()}
          disabled={isSearching}
          className="rounded-xl px-3 py-2"
          style={{ backgroundColor: color.accent.primary, opacity: isSearching ? 0.6 : 1 }}
          accessibilityRole="button"
          accessibilityLabel={t('aiModels.hfSearchAction')}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={color.icon.onAccent} />
          ) : (
            <Text className="text-[14px] font-semibold" style={{ color: color.icon.onAccent }}>
              {t('aiModels.hfSearchAction')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {searchError ? (
        <Text className="mb-2 px-1 text-[13px] leading-5" style={{ color: color.text.muted }}>
          {searchError}
        </Text>
      ) : null}

      {results.length > 0 ? (
        <View
          className="overflow-hidden rounded-2xl"
          style={{ borderWidth: 1, borderColor: color.border.default }}
        >
          {results.map((result, index) => {
            const modelId = buildCustomLocalAiModelId(result.repoId, result.fileName);
            const status = localLlmModelStatuses[modelId];
            const isInstalled = installedIds.has(modelId) && status === 'downloaded';
            const isDownloading = status === 'downloading';
            const isLast = index === results.length - 1;
            const borderStyle = !isLast
              ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
              : {};

            return (
              <View
                key={`${result.repoId}/${result.fileName}`}
                className="px-4 py-3"
                style={[{ backgroundColor: color.background.card }, borderStyle]}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text
                      className="text-[15px] font-semibold"
                      style={{ color: color.text.primary }}
                    >
                      {result.displayName}
                    </Text>
                    <Text className="mt-0.5 text-[13px]" style={{ color: color.text.muted }}>
                      {result.repoId}
                    </Text>
                    <Text className="mt-1 text-[13px]" style={{ color: color.text.secondary }}>
                      {formatFileSize(result.sizeBytes)}
                      {result.quantLabel ? ` · ${result.quantLabel}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleInstall(result)}
                    disabled={isDownloading || isInstalled}
                    className="flex-row items-center gap-1 rounded-full px-3 py-2"
                    style={{
                      backgroundColor: isInstalled
                        ? color.background.tertiary
                        : color.status.processing.bg,
                      opacity: isDownloading ? 0.6 : 1,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isInstalled ? t('aiModels.hfSearchInstalled') : t('aiModels.hfSearchInstall')
                    }
                  >
                    <Download
                      size={14}
                      color={isInstalled ? color.text.muted : color.status.processing.text}
                      strokeWidth={2}
                    />
                    <Text
                      className="text-[13px] font-medium"
                      style={{
                        color: isInstalled ? color.text.muted : color.status.processing.text,
                      }}
                    >
                      {isInstalled
                        ? t('aiModels.hfSearchInstalled')
                        : isDownloading
                          ? t('aiModels.hfSearchDownloading')
                          : t('aiModels.hfSearchInstall')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};
