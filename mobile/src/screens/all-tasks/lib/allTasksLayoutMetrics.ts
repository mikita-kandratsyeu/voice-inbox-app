export type AllTasksCalendarMetrics = {
  cardPaddingH: number;
  cardPaddingV: number;
  headerFontSize: number;
  selectedDateTitleFontSize: number;
  headerSubtitleFontSize: number;
  monthFontSize: number;
  weekdayFontSize: number;
  weekdayToDayNumberGap: number;
  dayNumberFontSize: number;
  dayCellHeight: number;
  selectedDayRadius: number;
  navButtonSize: number;
  navIconSize: number;
  dotSize: number;
};

export function getAllTasksCalendarMetrics(isTablet: boolean): AllTasksCalendarMetrics {
  if (isTablet) {
    return {
      cardPaddingH: 18,
      cardPaddingV: 16,
      headerFontSize: 17,
      selectedDateTitleFontSize: 20,
      headerSubtitleFontSize: 15,
      monthFontSize: 14,
      weekdayFontSize: 13,
      weekdayToDayNumberGap: 5,
      dayNumberFontSize: 18,
      dayCellHeight: 64,
      selectedDayRadius: 14,
      navButtonSize: 36,
      navIconSize: 24,
      dotSize: 4,
    };
  }

  return {
    cardPaddingH: 14,
    cardPaddingV: 12,
    headerFontSize: 16,
    selectedDateTitleFontSize: 18,
    headerSubtitleFontSize: 14,
    monthFontSize: 13,
    weekdayFontSize: 11,
    weekdayToDayNumberGap: 4,
    dayNumberFontSize: 16,
    dayCellHeight: 56,
    selectedDayRadius: 12,
    navButtonSize: 32,
    navIconSize: 22,
    dotSize: 3.5,
  };
}
