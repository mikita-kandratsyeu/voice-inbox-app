import type { LucideProps } from 'lucide-react-native';
import { Workflow } from 'lucide-react-native';
import React from 'react';

/** Nav / menu icon for the notes graph — connected nodes, not a route path. */
export function NotesGraphIcon(props: LucideProps) {
  return <Workflow strokeWidth={2.2} {...props} />;
}
