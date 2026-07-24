import { suggestMobileBannerId } from './mobile-banner-id';

describe('suggestMobileBannerId', () => {
  it('builds id from english title and start date', () => {
    expect(
      suggestMobileBannerId({
        titleEn: 'Try Pro for faster AI',
        startsAt: '2026-06-23T00:00:00.000Z',
        now: new Date('2026-06-01T12:00:00.000Z'),
      }),
    ).toBe('try_pro_for_faster_ai_20260623');
  });

  it('falls back to russian title when english is empty', () => {
    expect(
      suggestMobileBannerId({
        titleRu: 'Попробуйте Pro',
        now: new Date('2026-06-01T12:00:00.000Z'),
      }),
    ).toBe('pro_20260601');
  });

  it('uses today when start date is missing', () => {
    expect(
      suggestMobileBannerId({
        titleEn: 'Beta feedback',
        now: new Date('2026-06-23T15:00:00.000Z'),
      }),
    ).toBe('beta_feedback_20260623');
  });
});
