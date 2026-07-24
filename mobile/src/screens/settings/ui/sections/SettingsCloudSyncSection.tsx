import type { TFunction } from 'i18next';
import React from 'react';

import { SettingsGithubSyncRows } from '@/features/github-sync';
import { SettingsGitlabSyncRows } from '@/features/gitlab-sync';
import { SettingsIcloudSyncRows } from '@/features/icloud-sync';
import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  cloudSyncLocked: boolean;
  onLockedPress: () => void;
};

export const SettingsCloudSyncSection = ({ color, t, cloudSyncLocked, onLockedPress }: Props) => {
  const showIcloud = IS_IOS;

  return (
    <SettingsSection
      title={t('settings.cloudSync.sectionTitle')}
      showTitleProBadge={cloudSyncLocked}
    >
      {showIcloud ? (
        <SettingsIcloudSyncRows
          color={color}
          t={t}
          suppressProBadge={cloudSyncLocked}
          onLockedPress={onLockedPress}
          isFirst
          isLast={false}
        />
      ) : null}
      <SettingsGithubSyncRows
        color={color}
        t={t}
        suppressProBadge={cloudSyncLocked}
        onLockedPress={onLockedPress}
        isFirst={!showIcloud}
        isLast={false}
      />
      <SettingsGitlabSyncRows
        color={color}
        t={t}
        suppressProBadge={cloudSyncLocked}
        onLockedPress={onLockedPress}
        isLast
      />
    </SettingsSection>
  );
};
