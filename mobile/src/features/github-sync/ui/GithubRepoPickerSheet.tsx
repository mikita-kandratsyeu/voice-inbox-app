import React from 'react';

import { GitRemoteRepoPickerSheet } from '@/features/git-remote-sync';

import type { GithubRepoSummary } from '../lib/githubApi';
import { GithubIcon } from './GithubIcon';

type Props = {
  visible: boolean;
  color: import('@/shared/config').Colors;
  repos: GithubRepoSummary[];
  loading: boolean;
  creating?: boolean;
  currentRepoFullName?: string | null;
  pinnedRepoFullNames?: string[];
  onClose: () => void;
  onSelect: (repo: GithubRepoSummary) => void | Promise<void>;
  onCreateRepo: (name: string) => void | Promise<void>;
  onLoadRepos: () => void | Promise<void>;
  onTogglePinnedRepo?: (fullName: string) => 'max' | 'ok';
};

export function GithubRepoPickerSheet(props: Props) {
  return (
    <GitRemoteRepoPickerSheet
      {...props}
      i18nPrefix="settings.githubSync"
      repoIcon={<GithubIcon size={18} color={props.color.accent.primary} />}
    />
  );
}
