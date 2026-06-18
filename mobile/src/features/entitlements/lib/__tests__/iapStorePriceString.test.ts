jest.mock('@/shared/lib/i18n', () => ({
  i18n: { language: 'en' },
}));

import {
  formatIapAmountLikeStorePrice,
  resolveDerivedIapPriceString,
  resolveIapPriceString,
  resolveScaledIapPriceString,
} from '../iapStorePriceString';

describe('iapStorePriceString', () => {
  describe('resolveIapPriceString', () => {
    it('prefers the store price string over Intl fallback', () => {
      expect(resolveIapPriceString('₺449,99', 449.99, 'TRY')).toBe('₺449,99');
      expect(resolveIapPriceString('$9.99', 9.99, 'USD')).toBe('$9.99');
      expect(resolveIapPriceString('29,99 zł', 29.99, 'PLN')).toBe('29,99 zł');
      expect(resolveIapPriceString('449,00 ₽', 449, 'RUB')).toBe('449,00 ₽');
    });

    it('falls back to Intl when the store omits a price string', () => {
      expect(resolveIapPriceString(null, 9.99, 'USD')).toBe('$9.99');
      expect(resolveIapPriceString('   ', 29.99, 'PLN')).toBe('zł\u00a029.99');
    });
  });

  describe('formatIapAmountLikeStorePrice', () => {
    test.each([
      // Turkey — prefix symbol, comma decimals, dot thousands when scaled up
      ['Turkey annual compare-at', '₺449,99', 5399.88, '₺5.399,88'],
      ['Turkey annual per-month equivalent', '₺449,99', 37.5, '₺37,50'],

      // Poland — suffix zł, comma decimals
      ['Poland annual per-month equivalent', '149,99 zł', 12.49, '12,49 zł'],
      ['Poland monthly compare-at', '29,99 zł', 359.88, '359,88 zł'],

      // United States — prefix $, dot decimals
      ['United States annual compare-at', '$9.99', 119.88, '$119.88'],

      // Eurozone — suffix €, comma decimals
      ['Germany annual compare-at', '9,99 €', 119.88, '119,88 €'],
      ['Germany large compare-at with grouping', '1.234,56 €', 14814.72, '14.814,72 €'],
      ['France with non-breaking space before €', '9,99\u00a0€', 119.88, '119,88\u00a0€'],

      // United Kingdom — prefix £
      ['United Kingdom annual compare-at', '£9.99', 119.88, '£119.88'],

      // Russia — suffix ₽, comma decimals, space thousands when scaled
      ['Russia annual compare-at from monthly template', '449,00 ₽', 5388, '5.388,00 ₽'],
      ['Russia annual compare-at from annual template', '2 490,00 ₽', 5388, '5 388,00 ₽'],
      ['Russia annual per-month equivalent', '2 490,00 ₽', 207.5, '207,50 ₽'],

      // Japan — integer yen, no fractional digits
      ['Japan annual compare-at', '¥1200', 14400, '¥14400'],
      ['Japan annual per-month equivalent', '¥1200', 100, '¥100'],

      // Brazil — prefix R$, comma decimals
      ['Brazil annual compare-at', 'R$ 29,90', 358.8, 'R$ 358,80'],
      ['Brazil annual per-month equivalent', 'R$ 29,90', 2.49, 'R$ 2,49'],

      // India — prefix ₹, US-style grouping for large compare-at amounts
      ['India annual compare-at', '₹999.00', 11988, '₹11,988.00'],

      // Sweden — suffix kr
      ['Sweden annual compare-at', '99,00 kr', 1188, '1.188,00 kr'],
      ['Sweden annual per-month equivalent', '99,00 kr', 8.25, '8,25 kr'],

      // Switzerland — suffix CHF code in store layout
      ['Switzerland annual compare-at', '9,99 CHF', 119.88, '119,88 CHF'],

      // Ukraine — suffix ₴
      ['Ukraine annual compare-at', '449,99 ₴', 5399.88, '5.399,88 ₴'],
      ['Ukraine annual per-month equivalent', '449,99 ₴', 37.5, '37,50 ₴'],

      // Czechia — suffix Kč
      ['Czechia annual compare-at', '249,00 Kč', 2988, '2.988,00 Kč'],
    ])('%s', (_label, template, amount, expected) => {
      expect(formatIapAmountLikeStorePrice(template, amount)).toBe(expected);
    });

    it('returns null for invalid inputs', () => {
      expect(formatIapAmountLikeStorePrice('', 10)).toBeNull();
      expect(formatIapAmountLikeStorePrice('pro only', 10)).toBeNull();
      expect(formatIapAmountLikeStorePrice('₺10,00', Number.NaN)).toBeNull();
    });
  });

  describe('resolveDerivedIapPriceString', () => {
    test.each([
      [
        'Poland — zł layout beats PLN ISO in per-month string',
        '149,99 zł',
        12.49,
        '12,49 PLN',
        'PLN',
        '12,49 zł',
      ],
      [
        'Turkey — ₺ layout beats TRY ISO in per-month string',
        '₺449,99',
        37.5,
        '37,50 TRY',
        'TRY',
        '₺37,50',
      ],
      [
        'Russia — ₽ layout beats RUB ISO in per-month string',
        '2 490,00 ₽',
        207.5,
        '207,50 RUB',
        'RUB',
        '207,50 ₽',
      ],
      [
        'Ukraine — ₴ layout beats UAH ISO in per-month string',
        '449,99 ₴',
        37.5,
        '37,50 UAH',
        'UAH',
        '37,50 ₴',
      ],
      [
        'Sweden — kr layout beats SEK ISO in per-month string',
        '99,00 kr',
        8.25,
        '8,25 SEK',
        'SEK',
        '8,25 kr',
      ],
      [
        'Brazil — R$ layout beats BRL ISO in per-month string',
        'R$ 29,90',
        2.49,
        '2,49 BRL',
        'BRL',
        'R$ 2,49',
      ],
    ])('%s', (_label, layoutRef, amount, storePerMonth, currency, expected) => {
      expect(resolveDerivedIapPriceString(layoutRef, amount, storePerMonth, currency)).toBe(
        expected,
      );
    });

    it('falls back to the store per-month string when layout reference is missing', () => {
      expect(resolveDerivedIapPriceString(null, 12.49, '12,49 zł', 'PLN')).toBe('12,49 zł');
    });
  });

  describe('resolveScaledIapPriceString', () => {
    test.each([
      ['Turkey', '₺449,99', 5399.88, 'TRY', '₺5.399,88'],
      ['Poland', '29,99 zł', 359.88, 'PLN', '359,88 zł'],
      ['United States', '$9.99', 119.88, 'USD', '$119.88'],
      ['Eurozone', '9,99 €', 119.88, 'EUR', '119,88 €'],
      ['United Kingdom', '£9.99', 119.88, 'GBP', '£119.88'],
      ['Russia', '449,00 ₽', 5388, 'RUB', '5.388,00 ₽'],
      ['Japan', '¥1200', 14400, 'JPY', '¥14400'],
      ['Ukraine', '449,99 ₴', 5399.88, 'UAH', '5.399,88 ₴'],
    ])(
      '%s annual compare-at from monthly template',
      (_label, monthly, yearAmount, currency, expected) => {
        expect(resolveScaledIapPriceString(monthly, yearAmount, currency)).toBe(expected);
      },
    );

    it('uses annual store layout for Russian space thousands in compare-at', () => {
      expect(resolveScaledIapPriceString('449,00 ₽', 5388, 'RUB', '2 490,00 ₽')).toBe('5 388,00 ₽');
    });

    it('falls back to Intl when the monthly template is missing', () => {
      expect(resolveScaledIapPriceString(null, 119.88, 'USD')).toBe('$119.88');
    });
  });
});
