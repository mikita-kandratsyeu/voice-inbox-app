import { getAllTasksCalendarMetrics } from '../allTasksLayoutMetrics';

describe('getAllTasksCalendarMetrics', () => {
  it('returns compact phone metrics', () => {
    const metrics = getAllTasksCalendarMetrics(false);

    expect(metrics.dayCellHeight).toBe(56);
    expect(metrics.navIconSize).toBe(22);
    expect(metrics.selectedDateTitleFontSize).toBeLessThan(
      getAllTasksCalendarMetrics(true).selectedDateTitleFontSize,
    );
  });

  it('returns roomier tablet metrics', () => {
    const metrics = getAllTasksCalendarMetrics(true);

    expect(metrics.dayCellHeight).toBe(64);
    expect(metrics.navButtonSize).toBe(36);
    expect(metrics.navIconSize).toBe(24);
  });
});
