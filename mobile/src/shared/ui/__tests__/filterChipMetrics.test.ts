import {
  FILTER_CHIP_MIN_HEIGHT,
  FILTER_CHIP_SCROLL_CONTENT_EMBEDDED_STYLE,
  FILTER_CHIP_SCROLL_CONTENT_STYLE,
  FILTER_CHIP_SCROLL_PADDING_V,
  filterChipRowStyle,
} from '../filterChipMetrics';

describe('filterChipMetrics', () => {
  it('uses equal vertical padding for horizontal chip scrollers', () => {
    expect(FILTER_CHIP_SCROLL_CONTENT_STYLE.paddingVertical).toBe(FILTER_CHIP_SCROLL_PADDING_V);
    expect(FILTER_CHIP_SCROLL_CONTENT_STYLE.paddingHorizontal).toBe(16);
  });

  it('removes top padding for embedded chip rows while keeping bottom inset', () => {
    expect(FILTER_CHIP_SCROLL_CONTENT_EMBEDDED_STYLE.paddingTop).toBe(0);
    expect(FILTER_CHIP_SCROLL_CONTENT_EMBEDDED_STYLE.paddingVertical).toBe(
      FILTER_CHIP_SCROLL_PADDING_V,
    );
    expect(FILTER_CHIP_SCROLL_CONTENT_EMBEDDED_STYLE.paddingHorizontal).toBe(16);
  });

  it('builds chip row style with shared metrics and default border color', () => {
    const style = filterChipRowStyle('#111111');

    expect(style.backgroundColor).toBe('#111111');
    expect(style.borderColor).toBe('#111111');
    expect(style.minHeight).toBe(FILTER_CHIP_MIN_HEIGHT);
    expect(style.alignItems).toBe('center');
    expect(style.alignSelf).toBe('center');
  });

  it('allows explicit border color override', () => {
    const style = filterChipRowStyle('#111111', '#222222');

    expect(style.backgroundColor).toBe('#111111');
    expect(style.borderColor).toBe('#222222');
  });
});
