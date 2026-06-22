import { MenuView } from '@react-native-menu/menu';
import { ChevronDown } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

import { navigateSettingsStackScreen } from '@/app/navigation/tablet/tabletTabNavigation';
import { isPrivateCustomServerMode, useSettingsStore } from '@/entities/settings';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection, type NativeMenuAction } from '@/shared/lib';
import { FrostedChromeSurface } from '@/shared/ui';

import { buildAskAiModelMenuActions, resolveAskAiMenuAction } from './lib/askAiModelMenu';
import { useAskAiModelLabel } from './lib/useAskAiModelLabel';

type AskAiModelChipMenuProps = {
  color: Colors;
};

export function AskAiModelChipMenu({ color }: AskAiModelChipMenuProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const modelLabel = useAskAiModelLabel();
  const { isProActive } = useProEntitlement();

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);
  const localLlmModelStatuses = useSettingsStore((s) => s.localLlmModelStatuses);
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const setAiModelRoutingMode = useSettingsStore((s) => s.setAiModelRoutingMode);
  const setLocalAiModel = useSettingsStore((s) => s.setLocalAiModel);

  const isCustomRemote = isPrivateCustomServerMode(aiExecutionMode, privateAiProvider, isProActive);
  const isPrivateDevice = aiExecutionMode === 'private_experimental' && !isCustomRemote;
  const titleColor = color.text.primary;

  const menuActions = useMemo<NativeMenuAction[]>(
    () =>
      buildAskAiModelMenuActions({
        t,
        titleColor,
        isProActive,
        isCustomRemote,
        isPrivateDevice,
        aiModelRoutingMode,
        selectedAIModel,
        selectedLocalAiModel,
        localLlmModelStatuses,
      }),
    [
      aiModelRoutingMode,
      isCustomRemote,
      isPrivateDevice,
      isProActive,
      localLlmModelStatuses,
      selectedAIModel,
      selectedLocalAiModel,
      t,
      titleColor,
    ],
  );

  const openFullPicker = useCallback(() => {
    KeyboardController.dismiss({ animated: false });
    requestAnimationFrame(() => {
      navigateSettingsStackScreen('AIModelPicker');
    });
  }, []);

  const openRemoteServerSettings = useCallback(() => {
    KeyboardController.dismiss({ animated: false });
    requestAnimationFrame(() => {
      navigateSettingsStackScreen('PrivateRemoteServer');
    });
  }, []);

  const handleMenuAction = useCallback(
    (actionId: string) => {
      const resolved = resolveAskAiMenuAction(actionId);
      if (!resolved) return;

      if (resolved === 'all_models') {
        openFullPicker();
        return;
      }
      if (resolved === 'remote_settings') {
        openRemoteServerSettings();
        return;
      }
      if (resolved.kind === 'auto') {
        setAiModelRoutingMode('auto');
      } else if (resolved.kind === 'cloud') {
        setAiModelRoutingMode('manual');
        setAIModel(resolved.id);
      } else {
        setLocalAiModel(resolved.id);
      }
    },
    [openFullPicker, openRemoteServerSettings, setAIModel, setAiModelRoutingMode, setLocalAiModel],
  );

  return (
    <MenuView
      key={`ask-ai-model-menu-${theme}`}
      themeVariant={isDark ? 'dark' : 'light'}
      onPressAction={({ nativeEvent }) => {
        hapticSelection();
        handleMenuAction(nativeEvent.event);
      }}
      actions={menuActions}
    >
      <FrostedChromeSurface
        color={color}
        borderRadius={9999}
        shadow="subtle"
        style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('recordingDetail.askModelChipA11y', { model: modelLabel })}
          activeOpacity={0.75}
          className="max-w-full min-h-8 flex-row items-center gap-1 px-3 py-1.5"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text
            className="shrink text-[13px] font-semibold leading-[18px]"
            numberOfLines={1}
            style={{ color: color.text.primary }}
          >
            {modelLabel}
          </Text>
          <ChevronDown size={14} color={color.text.secondary} strokeWidth={2.2} />
        </TouchableOpacity>
      </FrostedChromeSurface>
    </MenuView>
  );
}
