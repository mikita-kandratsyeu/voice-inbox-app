import { getSubscriptionsPubliclyAvailable } from '../model/monetizationPublicConfig';
import { isTestflightInternalBuild } from './testflightInternalBuild';

export function shouldApplyAutoTranscribeOnSave(
  persistedToggle: boolean,
  isProActive: boolean,
): boolean {
  if (!persistedToggle) {
    return false;
  }

  if (isTestflightInternalBuild()) {
    return true;
  }

  if (!getSubscriptionsPubliclyAvailable()) {
    return false;
  }

  return isProActive;
}

export function shouldApplyAutoAiAfterTranscription(
  persistedToggle: boolean,
  isProActive: boolean,
): boolean {
  return shouldApplyAutoTranscribeOnSave(persistedToggle, isProActive);
}
