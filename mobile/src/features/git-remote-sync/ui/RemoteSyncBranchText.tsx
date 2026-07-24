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

type Props = {
  i18nKey: string;
  branch: string;
  style?: TextStyle;
  className?: string;
};

export function remoteSyncBranchA11yLabel(t: TFunction, i18nKey: string, branch: string): string {
  return t(i18nKey, { branch }).replace(/<\/?mono>/g, '');
}

export function RemoteSyncBranchText({ i18nKey, branch, style, className }: Props) {
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
