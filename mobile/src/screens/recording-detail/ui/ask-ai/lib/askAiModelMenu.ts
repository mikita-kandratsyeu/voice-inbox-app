import type { TFunction } from 'i18next';
import type { ColorValue } from 'react-native';

import {
  findCloudAiModelCatalogEntry,
  LOCAL_AI_MODELS,
  type LocalAiModelId,
  partitionCloudModelsForPicker,
  type UserFacingAIModel,
  type UserSelectableAIModelId,
  type WhisperModelStatus,
} from '@/entities/settings';
import { inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';

const MENU_ALL_MODELS = '__all_models__';
const MENU_REMOTE_SETTINGS = '__remote_settings__';

export type AskAiMenuActionResolution =
  | 'all_models'
  | 'remote_settings'
  | { kind: 'auto' }
  | { kind: 'cloud'; id: UserSelectableAIModelId }
  | { kind: 'local'; id: LocalAiModelId };

function formatCloudModelMenuTitle(t: TFunction, modelId: string, modelName: string): string {
  const entry = findCloudAiModelCatalogEntry(modelId);
  const tierLabel = entry ? t(entry.tierLabelKey) : modelName;

  if (!entry || tierLabel.trim() === modelName.trim()) {
    return tierLabel;
  }

  return modelName;
}

function toCloudMenuAction(
  model: UserFacingAIModel,
  titleColor: ColorValue,
  t: TFunction,
  aiModelRoutingMode: 'auto' | 'manual',
  selectedAIModel: UserSelectableAIModelId,
): NativeMenuAction {
  return {
    id: model.id,
    title: formatCloudModelMenuTitle(t, model.id, model.name),
    titleColor,
    state: aiModelRoutingMode === 'manual' && selectedAIModel === model.id ? 'on' : 'off',
  };
}

/** Bottom-anchored MenuView renders subactions in reverse; flip to match settings picker order. */
function cloudModelsToMenuSubactions(
  models: readonly UserFacingAIModel[],
  titleColor: ColorValue,
  t: TFunction,
  aiModelRoutingMode: 'auto' | 'manual',
  selectedAIModel: UserSelectableAIModelId,
): NativeMenuAction[] {
  return [...models]
    .reverse()
    .map((model) => toCloudMenuAction(model, titleColor, t, aiModelRoutingMode, selectedAIModel));
}

export function buildAskAiModelMenuActions(params: {
  t: TFunction;
  titleColor: ColorValue;
  isProActive: boolean;
  isCustomRemote: boolean;
  isPrivateDevice: boolean;
  aiModelRoutingMode: 'auto' | 'manual';
  selectedAIModel: UserSelectableAIModelId;
  selectedLocalAiModel: LocalAiModelId | null;
  localLlmModelStatuses: Partial<Record<LocalAiModelId, WhisperModelStatus>>;
}): NativeMenuAction[] {
  const {
    t,
    titleColor,
    isProActive,
    isCustomRemote,
    isPrivateDevice,
    aiModelRoutingMode,
    selectedAIModel,
    selectedLocalAiModel,
    localLlmModelStatuses,
  } = params;

  if (isCustomRemote) {
    return [
      {
        id: MENU_REMOTE_SETTINGS,
        title: t('recordingDetail.askModelOpenRemoteSettings'),
        titleColor,
      },
    ];
  }

  if (isPrivateDevice) {
    const downloadedModels = LOCAL_AI_MODELS.filter(
      (model) => (localLlmModelStatuses[model.id] ?? 'not_downloaded') === 'downloaded',
    );
    const localActions = [...downloadedModels].reverse().map((model) => ({
      id: model.id,
      title: model.name,
      titleColor,
      state: selectedLocalAiModel === model.id ? ('on' as const) : ('off' as const),
    }));

    const sections: NativeMenuAction[] = [
      inlineNativeMenuSection('askAiLocalMore', titleColor, [
        {
          id: MENU_ALL_MODELS,
          title: t('recordingDetail.askModelAllModels'),
          titleColor,
        },
      ]),
    ];
    if (localActions.length > 0) {
      sections.push(
        inlineNativeMenuSection(
          'askAiLocalModels',
          titleColor,
          localActions,
          t('aiModels.privateModeLabel'),
        ),
      );
    }
    return sections;
  }

  const { standard, advanced } = partitionCloudModelsForPicker(selectedAIModel);

  // Match AIModelPickerScreen: Auto → standard → advanced. MenuView is anchored on the
  // bottom composer chip (menu grows up): build bottom→top, reverse rows inside sections.
  const actions: NativeMenuAction[] = [];

  if (isProActive && advanced.length > 0) {
    actions.push(
      inlineNativeMenuSection(
        'askAiProModels',
        titleColor,
        cloudModelsToMenuSubactions(advanced, titleColor, t, aiModelRoutingMode, selectedAIModel),
        t('aiModels.advancedSectionTitle'),
      ),
    );
  }

  if (standard.length > 0) {
    actions.push(
      inlineNativeMenuSection(
        'askAiStandardModels',
        titleColor,
        cloudModelsToMenuSubactions(standard, titleColor, t, aiModelRoutingMode, selectedAIModel),
        t('aiModels.standardSectionTitle'),
      ),
    );
  }

  actions.push({
    id: 'auto',
    title: t('aiModels.tierAuto'),
    titleColor,
    state: aiModelRoutingMode === 'auto' ? 'on' : 'off',
  });

  return actions;
}

export function resolveAskAiMenuAction(actionId: string): AskAiMenuActionResolution | null {
  if (actionId === MENU_ALL_MODELS) return 'all_models';
  if (actionId === MENU_REMOTE_SETTINGS) return 'remote_settings';
  if (actionId === 'auto') return { kind: 'auto' };
  if (actionId.startsWith('local/')) {
    return { kind: 'local', id: actionId as LocalAiModelId };
  }
  const cloud = findCloudAiModelCatalogEntry(actionId);
  if (cloud) {
    return { kind: 'cloud', id: cloud.id };
  }
  return null;
}
