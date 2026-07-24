import type { TFunction } from 'i18next';
import React from 'react';
import { Trans } from 'react-i18next';
import { Text, type TextStyle } from 'react-native';

import { selectPlatform } from '@/shared/lib';

const CODE_FONT_FAMILY = selectPlatform({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

type GithubSyncBranchTextKey =
  | 'settings.githubSync.repoBranch'
  | 'settings.githubSync.selectRepoSubtitle';

type Props = {
  i18nKey: GithubSyncBranchTextKey;
  branch: string;
  style?: TextStyle;
  className?: string;
};

export function githubSyncBranchA11yLabel(
  t: TFunction,
  i18nKey: GithubSyncBranchTextKey,
  branch: string,
): string {
  return t(i18nKey, { branch }).replace(/<\/?mono>/g, '');
}

export function GithubSyncBranchText({ i18nKey, branch, style, className }: Props) {
  return (
    <Text className={className} style={style}>
      <Trans
        i18nKey={i18nKey}
        values={{ branch }}
        components={{
          mono: <Text style={{ fontFamily: CODE_FONT_FAMILY }} />,
        }}
      />
    </Text>
  );
}
