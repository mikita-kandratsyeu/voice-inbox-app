import type { TFunction } from 'i18next';
import type { ColorValue } from 'react-native';

import {
  findCloudAiModelCatalogEntry,
  getAllLocalAiModelEntries,
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

export type AskAiModelMenuPlacement = 'bottomAnchored' | 'inline';

function cloudModelsToMenuSubactions(
  models: readonly UserFacingAIModel[],
  titleColor: ColorValue,
  t: TFunction,
  aiModelRoutingMode: 'auto' | 'manual',
  selectedAIModel: UserSelectableAIModelId,
  reverseRows: boolean,
): NativeMenuAction[] {
  const ordered = reverseRows ? [...models].reverse() : [...models];
  return ordered.map((model) =>
    toCloudMenuAction(model, titleColor, t, aiModelRoutingMode, selectedAIModel),
  );
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
  /** `bottomAnchored` — Ask AI composer; `inline` — chips in note content (menu opens down). */
  menuPlacement?: AskAiModelMenuPlacement;
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
    menuPlacement = 'bottomAnchored',
  } = params;

  const reverseRows = menuPlacement === 'bottomAnchored';

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
    const downloadedModels = getAllLocalAiModelEntries().filter(
      (model) => (localLlmModelStatuses[model.id] ?? 'not_downloaded') === 'downloaded',
    );
    const orderedLocalModels = reverseRows ? [...downloadedModels].reverse() : downloadedModels;
    const localActions = orderedLocalModels.map((model) => ({
      id: model.id,
      title: model.name,
      titleColor,
      state: selectedLocalAiModel === model.id ? ('on' as const) : ('off' as const),
    }));

    const emptyMenuHint: NativeMenuAction = {
      id: '__local_models_empty__',
      title: t('recordingDetail.askModelMenuNoLocalModels'),
      titleColor,
      attributes: { disabled: true },
    };

    const allModelsSection = inlineNativeMenuSection('askAiLocalMore', titleColor, [
      {
        id: MENU_ALL_MODELS,
        title: t('recordingDetail.askModelAllModels'),
        titleColor,
      },
    ]);
    const localSection =
      localActions.length > 0
        ? inlineNativeMenuSection(
            'askAiLocalModels',
            titleColor,
            localActions,
            t('aiModels.privateModeLabel'),
          )
        : null;

    if (downloadedModels.length === 0) {
      return reverseRows ? [allModelsSection, emptyMenuHint] : [emptyMenuHint, allModelsSection];
    }

    return reverseRows
      ? [allModelsSection, ...(localSection ? [localSection] : [])]
      : [...(localSection ? [localSection] : []), allModelsSection];
  }

  const { standard, advanced } = partitionCloudModelsForPicker(selectedAIModel);

  const autoAction: NativeMenuAction = {
    id: 'auto',
    title: t('aiModels.tierAuto'),
    titleColor,
    state: aiModelRoutingMode === 'auto' ? 'on' : 'off',
  };

  const standardSection =
    standard.length > 0
      ? inlineNativeMenuSection(
          'askAiStandardModels',
          titleColor,
          cloudModelsToMenuSubactions(
            standard,
            titleColor,
            t,
            aiModelRoutingMode,
            selectedAIModel,
            reverseRows,
          ),
          t('aiModels.standardSectionTitle'),
        )
      : null;

  const advancedSection =
    isProActive && advanced.length > 0
      ? inlineNativeMenuSection(
          'askAiProModels',
          titleColor,
          cloudModelsToMenuSubactions(
            advanced,
            titleColor,
            t,
            aiModelRoutingMode,
            selectedAIModel,
            reverseRows,
          ),
          t('aiModels.advancedSectionTitle'),
        )
      : null;

  if (menuPlacement === 'inline') {
    return [
      autoAction,
      ...(standardSection ? [standardSection] : []),
      ...(advancedSection ? [advancedSection] : []),
    ];
  }

  return [
    ...(advancedSection ? [advancedSection] : []),
    ...(standardSection ? [standardSection] : []),
    autoAction,
  ];
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
