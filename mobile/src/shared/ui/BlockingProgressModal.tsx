import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';

import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';

/** Matches RN Modal default fade duration so content isn’t cleared mid-animation. */
const MODAL_FADE_OUT_MS = 320;

export type BlockingProgressModalProps = {
  visible: boolean;
  title: string;
  description: string;
  /** Shown under the description when total > 0 (e.g. translated “3 of 12”). */
  progressLabel?: string;
  total: number;
};

/**
 * Full-screen dimmed overlay with spinner, title, optional “current of total” counter.
 * Used for import and batch inbox actions so long work feels responsive.
 *
 * Keeps the last title/description while the modal fades out so parents can clear state
 * immediately without empty text flashing.
 */
export const BlockingProgressModal = ({
  visible,
  title,
  description,
  progressLabel,
  total,
}: BlockingProgressModalProps) => {
  const color = useColors();

  const frozenRef = useRef({
    title: '',
    description: '',
    total: 0,
    progressLabel: undefined as string | undefined,
  });

  const snap = useMemo(() => {
    if (visible) {
      const next = { title, description, total, progressLabel };
      frozenRef.current = next;
      return next;
    }
    return frozenRef.current;
  }, [visible, title, description, total, progressLabel]);

  const [presentationVisible, setPresentationVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setPresentationVisible(true);
      return;
    }
    const done = setTimeout(() => {
      setPresentationVisible(false);
    }, MODAL_FADE_OUT_MS);
    return () => clearTimeout(done);
  }, [visible]);

  const showCounter = snap.total > 0 && snap.progressLabel != null;

  // Show immediately when visible flips on; keep mounted through fade-out (presentationVisible).
  const modalVisible = visible || presentationVisible;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      {...(IS_IOS ? ({ presentationStyle: 'overFullScreen' } as const) : {})}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <View
          className="w-full max-w-sm rounded-2xl px-6 py-8"
          style={{ backgroundColor: color.background.card }}
        >
          <View className="items-center justify-center">
            <ActivityIndicator size="large" color={color.accent.primary} />
          </View>
          <Text
            className="mt-5 text-center text-[16px] font-semibold leading-6"
            style={{ color: color.text.primary }}
          >
            {snap.title}
          </Text>
          <Text
            className="mt-2 text-center text-[14px] leading-5"
            style={{ color: color.text.secondary }}
          >
            {snap.description}
          </Text>
          {showCounter ? (
            <Text
              className="mt-3 text-center text-[13px] font-medium leading-5"
              style={{ color: color.accent.primary }}
            >
              {snap.progressLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};
