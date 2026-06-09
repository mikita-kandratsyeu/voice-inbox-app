/** Horizontal inset for task cards — keep calendar panel padding in sync. */
export function getAllTasksCardInsetH(isTablet: boolean): number {
  // Phone: AllTasksTaskRow mx-4 (16). Tablet: FlashList padding 12 + row mx-3 (12).
  return isTablet ? 24 : 16;
}
