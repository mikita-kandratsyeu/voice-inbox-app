import { getSubscriptionsPubliclyAvailable } from '../model/monetizationPublicConfig';
import { isTestflightInternalBuild } from './testflightInternalBuild';

export function shouldApplyAutoTranscribeOnSave(
  persistedToggle: boolean,
  isProActive: boolean,
): boolean {
  if (!persistedToggle || !isProActive) {
    return false;
  }

  if (isTestflightInternalBuild()) {
    return true;
  }

  return getSubscriptionsPubliclyAvailable();
}

export function shouldApplyAutoAiAfterTranscription(
  persistedToggle: boolean,
  isProActive: boolean,
): boolean {
  return shouldApplyAutoTranscribeOnSave(persistedToggle, isProActive);
}
