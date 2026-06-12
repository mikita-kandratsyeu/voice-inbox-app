import React from 'react';
import { Text } from 'react-native';

import type { Colors } from '@/shared/config';
import { getDocumentSectionHeadingStyle } from '@/shared/ui/documentMarkdownTheme';

type DocumentSectionTitleProps = {
  color: Colors;
  children: string;
  isFirst?: boolean;
};

export function DocumentSectionTitle({
  color,
  children,
  isFirst = false,
}: DocumentSectionTitleProps) {
  return (
    <Text style={[getDocumentSectionHeadingStyle(color), isFirst ? { marginTop: 0 } : null]}>
      {children}
    </Text>
  );
}
