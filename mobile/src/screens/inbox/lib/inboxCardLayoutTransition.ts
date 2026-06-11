import { LayoutAnimation, Platform } from 'react-native';
import { LinearTransition } from 'react-native-reanimated';

/** Perceptual spring length — matches UIKit-style list row resize (~Mail / Reminders). */
export const INBOX_CARD_LAYOUT_SPRING_DURATION_MS = 240;

/** FlashList sibling reflow — native LayoutAnimation on iOS, eased update on Android. */
export function prepareInboxCardLayoutAnimation(): void {
  LayoutAnimation.configureNext(
    Platform.select({
      ios: {
        duration: INBOX_CARD_LAYOUT_SPRING_DURATION_MS,
        update: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.86,
          initialVelocity: 0.45,
        },
        create: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.86,
          property: LayoutAnimation.Properties.opacity,
        },
        delete: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.86,
          property: LayoutAnimation.Properties.opacity,
        },
      },
      default: {
        duration: INBOX_CARD_LAYOUT_SPRING_DURATION_MS,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        delete: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      },
    }) ?? LayoutAnimation.Presets.spring,
  );
}

/**
 * UI-thread layout morph for the card shell — critically damped spring, no overshoot.
 * Pairs with FlashList `prepareForLayoutAnimationRender()` for sibling rows.
 */
export const inboxCardLayoutReanimatedTransition = LinearTransition.springify()
  .duration(INBOX_CARD_LAYOUT_SPRING_DURATION_MS)
  .dampingRatio(1);
