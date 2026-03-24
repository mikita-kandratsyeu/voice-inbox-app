import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import type { TranscriptSegment } from '@/entities/record';
import type { Colors } from '@/shared/config';

type TranscriptHighlightProps = {
  segments: TranscriptSegment[];
  currentPositionMs: number;
  color: Colors;
};

type ActiveSegmentInfo = {
  segmentId: string;
  activeWordIdx: number;
} | null;

const findActive = (segments: TranscriptSegment[], posMs: number): ActiveSegmentInfo => {
  if (posMs <= 0) return null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segStart = seg.startMs ?? 0;
    const segEnd =
      seg.endMs ?? (i + 1 < segments.length ? (segments[i + 1].startMs ?? Infinity) : Infinity);

    if (posMs >= segStart && posMs <= segEnd) {
      if (!seg.tokens || seg.tokens.length === 0) {
        return { segmentId: seg.id, activeWordIdx: -1 };
      }
      const tokenIdx = seg.tokens.findIndex((tok) => posMs >= tok.startMs && posMs <= tok.endMs);
      return {
        segmentId: seg.id,
        activeWordIdx: tokenIdx >= 0 ? tokenIdx : -1,
      };
    }
  }

  return null;
};

export const TranscriptHighlight = ({
  segments,
  currentPositionMs,
  color,
}: TranscriptHighlightProps) => {
  const active = useMemo(
    () => findActive(segments, currentPositionMs),
    [segments, currentPositionMs],
  );

  return (
    <View style={{ gap: 14, padding: 16 }}>
      {segments.map((seg) => {
        const isActiveSegment = active?.segmentId === seg.id;
        const hasTokens = seg.tokens && seg.tokens.length > 0;

        return (
          <View key={seg.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Text
              style={{
                width: 44,
                flexShrink: 0,
                paddingTop: 2,
                fontSize: 12,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                color: isActiveSegment ? color.accent.primary : color.text.secondary,
              }}
            >
              {seg.startTime}
            </Text>

            <View style={{ flex: 1 }}>
              {hasTokens ? (
                <Text style={{ fontSize: 14, lineHeight: 22, flexWrap: 'wrap' }}>
                  {seg.tokens!.map((tok, idx) => {
                    const isActiveWord = isActiveSegment && active?.activeWordIdx === idx;
                    return (
                      <Text
                        key={idx}
                        style={{
                          color: isActiveWord ? color.accent.primary : color.text.primary,
                          backgroundColor: isActiveWord
                            ? `${color.accent.primary}22`
                            : 'transparent',
                          fontWeight: isActiveWord ? '600' : '400',
                          borderRadius: 3,
                        }}
                      >
                        {tok.text}
                      </Text>
                    );
                  })}
                </Text>
              ) : (
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: isActiveSegment ? color.accent.primary : color.text.primary,
                    fontWeight: isActiveSegment ? '500' : '400',
                  }}
                >
                  {seg.text}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};
