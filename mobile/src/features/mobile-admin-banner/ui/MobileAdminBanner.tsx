import { ChevronRight, Megaphone, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { type MobileBanner, openMobileBannerCtaUrl } from '@/shared/lib/mobile-banner';
import { FrostedChromeSurface } from '@/shared/ui';

const BANNER_CHROME_RADIUS = 12;

type MobileAdminBannerProps = {
  banner: MobileBanner;
  color: Colors;
  onDismiss: () => void;
  /** Sticky inbox chrome above filters; `standalone` for skeleton / empty library. */
  placement?: 'floating' | 'standalone';
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function MobileAdminBanner({
  banner,
  color,
  onDismiss,
  placement = 'standalone',
  onLayout,
}: MobileAdminBannerProps) {
  const { t } = useTranslation();
  const showCta = Boolean(banner.ctaLabel?.trim() && banner.ctaUrl?.trim());
  const accent = color.accent.primary;
  const isFloating = placement === 'floating';

  return (
    <View
      accessibilityRole="summary"
      onLayout={onLayout}
      pointerEvents="box-none"
      style={
        isFloating
          ? { paddingHorizontal: 16, paddingTop: 8 }
          : { marginHorizontal: 16, marginVertical: 4 }
      }
    >
      <FrostedChromeSurface
        color={color}
        borderRadius={BANNER_CHROME_RADIUS}
        style={{ alignSelf: 'stretch', width: '100%' }}
      >
        <View className="px-3 py-3" style={{ alignSelf: 'stretch', width: '100%' }}>
          <View className="relative">
            <View className="flex-row items-start">
              <View
                className="mr-3 h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: withAlphaHex(accent, 0.14) }}
              >
                <Megaphone size={18} color={accent} strokeWidth={2} />
              </View>

              <View
                className="min-w-0 flex-1"
                style={{ paddingRight: banner.dismissible ? 30 : 0 }}
              >
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
      </FrostedChromeSurface>
    </View>
  );
}
