import { ChevronRight, Megaphone, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { type MobileBanner, openMobileBannerCtaUrl } from '@/shared/lib/mobile-banner';

const CARD_RADIUS = 16;

type MobileAdminBannerProps = {
  banner: MobileBanner;
  color: Colors;
  onDismiss: () => void;
};

export function MobileAdminBanner({ banner, color, onDismiss }: MobileAdminBannerProps) {
  const { t } = useTranslation();
  const showCta = Boolean(banner.ctaLabel?.trim() && banner.ctaUrl?.trim());
  const accent = color.accent.primary;

  return (
    <View
      accessibilityRole="summary"
      className="mx-4 mb-3 mt-1"
      style={{
        backgroundColor: color.background.card,
        borderColor: withAlphaHex(accent, 0.2),
        borderRadius: CARD_RADIUS,
        borderWidth: 1,
        elevation: 2,
        overflow: 'hidden',
        shadowColor: color.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: color.shadow.opacity,
        shadowRadius: 8,
      }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: withAlphaHex(accent, 0.055),
          }}
        />
        <View
          style={{
            backgroundColor: withAlphaHex(accent, 0.1),
            borderRadius: 999,
            height: 88,
            position: 'absolute',
            right: -18,
            top: -22,
            width: 116,
          }}
        />
      </View>

      <View className="px-4 py-3.5">
        <View className="relative">
          <View className="flex-row items-start">
            <View
              className="mr-3 h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: withAlphaHex(accent, 0.14) }}
            >
              <Megaphone size={18} color={accent} strokeWidth={2} />
            </View>

            <View className="min-w-0 flex-1" style={{ paddingRight: banner.dismissible ? 30 : 0 }}>
              <Text
                className="text-[15px] font-semibold leading-5"
                style={{ color: color.text.primary }}
              >
                {banner.title}
              </Text>
              <Text
                className="mt-1 text-[13px] leading-[18px]"
                style={{ color: color.text.secondary }}
              >
                {banner.body}
              </Text>
              {showCta ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={banner.ctaLabel ?? undefined}
                  onPress={() => void openMobileBannerCtaUrl(banner.ctaUrl ?? '')}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  className="mt-2.5 flex-row items-center self-start"
                  style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
                >
                  <Text className="text-[13px] font-semibold" style={{ color: accent }}>
                    {banner.ctaLabel}
                  </Text>
                  <ChevronRight
                    size={15}
                    color={accent}
                    strokeWidth={2.5}
                    style={{ marginLeft: -1, marginTop: 1 }}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          {banner.dismissible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={onDismiss}
              hitSlop={10}
              className="absolute -right-1 -top-1 h-8 w-8 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: withAlphaHex(color.text.muted, pressed ? 0.2 : 0.1),
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <X size={15} color={color.text.muted} strokeWidth={2.25} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
