import { getCloudModelsForPicker } from '../model/constants';
import type { UserFacingAIModel, UserSelectableAIModelId } from '../model/types';
import { isProOnlyAiModel } from './proOnlyAiModels';

/** Same standard/advanced split as {@link AIModelPickerScreen} manual cloud rows. */
export function partitionCloudModelsForPicker(selectedAIModel: UserSelectableAIModelId): {
  standard: UserFacingAIModel[];
  advanced: UserFacingAIModel[];
} {
  const models = getCloudModelsForPicker(selectedAIModel);
  return {
    standard: models.filter((model) => !isProOnlyAiModel(model.id)),
    advanced: models.filter((model) => isProOnlyAiModel(model.id)),
  };
}
