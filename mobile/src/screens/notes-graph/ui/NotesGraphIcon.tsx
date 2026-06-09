import type { LucideProps } from 'lucide-react-native';
import { GitBranch } from 'lucide-react-native';
import React from 'react';

/** Nav / menu icon for the notes graph — connected nodes, not a route path. */
export function NotesGraphIcon(props: LucideProps) {
  return <GitBranch strokeWidth={2.2} {...props} />;
}
