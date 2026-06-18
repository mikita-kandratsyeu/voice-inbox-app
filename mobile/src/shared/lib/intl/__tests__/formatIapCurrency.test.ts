const mockGetLocales = jest.fn(() => [{ languageTag: 'en-US', languageCode: 'en' }]);

jest.mock('react-native-localize', () => ({
  getLocales: () => mockGetLocales(),
}));

import {
  formatIapCurrency,
  getIapFormatLocale,
  resolveDerivedIapPriceString,
  resolveIapPriceString,
  resolveScaledIapPriceString,
} from '../formatIapCurrency';

function intlCurrency(locale: string, currency: string, amount: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
}

describe('formatIapCurrency', () => {
  beforeEach(() => {
    mockGetLocales.mockReturnValue([{ languageTag: 'en-US', languageCode: 'en' }]);
  });

  describe('getIapFormatLocale', () => {
    it('uses the currency default locale for store regional formatting', () => {
      mockGetLocales.mockReturnValue([{ languageTag: 'en-US', languageCode: 'en' }]);
      expect(getIapFormatLocale('RUB')).toBe('ru-RU');
      expect(getIapFormatLocale('PLN')).toBe('pl-PL');
    });

    it('falls back to en-US for an invalid currency code', () => {
      mockGetLocales.mockReturnValue([{ languageTag: 'fr-FR', languageCode: 'fr' }]);
      expect(getIapFormatLocale('INVALID')).toBe('en-US');
    });
  });

  describe('formatIapCurrency', () => {
    test.each([
      ['Russia', 'ru-RU', 'RUB', 5388],
      ['Russia per-month', 'ru-RU', 'RUB', 207.5],
      ['Poland', 'pl-PL', 'PLN', 12.49],
      ['Poland compare-at', 'pl-PL', 'PLN', 359.88],
      ['Turkey', 'tr-TR', 'TRY', 5399.88],
      ['United States', 'en-US', 'USD', 119.88],
      ['Eurozone', 'de-DE', 'EUR', 119.88],
      ['United Kingdom', 'en-GB', 'GBP', 119.88],
      ['Japan', 'ja-JP', 'JPY', 14400],
      ['Ukraine', 'uk-UA', 'UAH', 5399.88],
      ['Brazil', 'pt-BR', 'BRL', 358.8],
      ['Sweden', 'sv-SE', 'SEK', 1188],
      ['Czechia', 'cs-CZ', 'CZK', 2988],
    ])('%s', (_label, locale, currency, amount) => {
      expect(formatIapCurrency(amount, currency, { locale })).toBe(
        intlCurrency(locale, currency, amount),
      );
    });
  });

  describe('resolveIapPriceString', () => {
    it('prefers the store price string', () => {
      expect(resolveIapPriceString('149,99 zł', 149.99, 'PLN')).toBe('149,99 zł');
      expect(resolveIapPriceString('₺449,99', 449.99, 'TRY')).toBe('₺449,99');
    });

    it('formats with Intl when the store omits a price string', () => {
      mockGetLocales.mockReturnValue([{ languageTag: 'pl-PL', languageCode: 'pl' }]);
      expect(resolveIapPriceString(null, 29.99, 'PLN')).toBe(intlCurrency('pl-PL', 'PLN', 29.99));
    });
  });

  describe('resolveScaledIapPriceString', () => {
    it('uses annual store layout for Russian compare-at with space thousands', () => {
      expect(resolveScaledIapPriceString('449,00 ₽', 5388, 'RUB', '2 490,00 ₽')).toBe('5 388,00 ₽');
    });

    it('falls back to Intl when no store template is available', () => {
      expect(resolveScaledIapPriceString(null, 119.88, 'USD')).toBe('$119.88');
    });
  });

  describe('resolveDerivedIapPriceString', () => {
    it('derives per-month from annual store layout instead of ISO store strings', () => {
      expect(resolveDerivedIapPriceString('149,99 zł', 12.49, '12,49 PLN', 'PLN')).toBe('12,49 zł');
    });

    it('derives Russian per-month from annual store layout', () => {
      expect(resolveDerivedIapPriceString('2 490,00 ₽', 207.5, '207,50 RUB', 'RUB')).toBe(
        '207,50 ₽',
      );
    });
  });
});
