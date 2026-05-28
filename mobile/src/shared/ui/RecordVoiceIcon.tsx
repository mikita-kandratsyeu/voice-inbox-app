import { AudioWaveform, type LucideProps } from 'lucide-react-native';
import React from 'react';

/** Voice capture / new recording — waveform lines read clearer than a plain mic at small sizes. */
export function RecordVoiceIcon({ strokeWidth = 2.2, ...props }: LucideProps) {
  return <AudioWaveform strokeWidth={strokeWidth} {...props} />;
}
