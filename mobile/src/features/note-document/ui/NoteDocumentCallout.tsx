import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  type LucideIcon,
  ShieldAlert,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import type { CalloutType } from '../lib/parseCallouts';

type NoteDocumentCalloutProps = {
  type: CalloutType;
  content: string;
  color: Colors;
  children?: React.ReactNode;
};

type CalloutConfig = {
  icon: LucideIcon;
  iconColor: string;
  backgroundColor: string;
  borderColor: string;
  title: string;
};

function getCalloutConfig(type: CalloutType, color: Colors): CalloutConfig {
  switch (type) {
    case 'note':
      return {
        icon: Info,
        iconColor: '#3B82F6', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: '#3B82F6',
        title: 'Note',
      };
    case 'tip':
      return {
        icon: Lightbulb,
        iconColor: '#10B981', // Green
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10B981',
        title: 'Tip',
      };
    case 'important':
      return {
        icon: AlertCircle,
        iconColor: '#8B5CF6', // Purple
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderColor: '#8B5CF6',
        title: 'Important',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconColor: '#F59E0B', // Orange
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: '#F59E0B',
        title: 'Warning',
      };
    case 'caution':
      return {
        icon: ShieldAlert,
        iconColor: '#EF4444', // Red
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#EF4444',
        title: 'Caution',
      };
  }
}

export const NoteDocumentCallout = React.memo(function NoteDocumentCallout({
  type,
  content,
  color,
  children,
}: NoteDocumentCalloutProps) {
  const config = useMemo(() => getCalloutConfig(type, color), [type, color]);
  const Icon = config.icon;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: config.backgroundColor,
        borderLeftWidth: 4,
        borderLeftColor: config.borderColor,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        gap: 12,
      }}
    >
      {/* Icon */}
      <View style={{ paddingTop: 2 }}>
        <Icon size={20} color={config.iconColor} strokeWidth={2} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Title */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: config.iconColor,
            marginBottom: 4,
          }}
        >
          {config.title}
        </Text>

        {/* Body */}
        {children ? (
          children
        ) : (
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: color.text.primary,
            }}
          >
            {content}
          </Text>
        )}
      </View>
    </View>
  );
});
