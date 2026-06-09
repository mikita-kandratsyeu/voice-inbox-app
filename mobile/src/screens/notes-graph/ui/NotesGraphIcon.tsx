import type { LucideProps } from 'lucide-react-native';
import { Network } from 'lucide-react-native';
import React from 'react';

/** Nav / menu icon for the notes graph — connected nodes, not a route path. */
export function NotesGraphIcon(props: LucideProps) {
  return <Network strokeWidth={2.2} {...props} />;
}
