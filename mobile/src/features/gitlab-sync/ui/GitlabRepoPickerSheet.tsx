import React from 'react';

import { GitRemoteRepoPickerSheet } from '@/features/git-remote-sync';

import type { GitlabRepoSummary } from '../lib/gitlabApi';
import { GitlabIcon } from './GitlabIcon';

type Props = {
  visible: boolean;
  color: import('@/shared/config').Colors;
  repos: GitlabRepoSummary[];
  loading: boolean;
  creating?: boolean;
  currentRepoFullName?: string | null;
  pinnedRepoFullNames?: string[];
  onClose: () => void;
  onSelect: (repo: GitlabRepoSummary) => void | Promise<void>;
  onCreateRepo: (name: string) => void | Promise<void>;
  onLoadRepos: () => void | Promise<void>;
  onTogglePinnedRepo?: (fullName: string) => 'max' | 'ok';
};

export function GitlabRepoPickerSheet(props: Props) {
  return (
    <GitRemoteRepoPickerSheet
      {...props}
      i18nPrefix="settings.gitlabSync"
      repoIcon={<GitlabIcon size={18} color={props.color.accent.primary} />}
    />
  );
}
