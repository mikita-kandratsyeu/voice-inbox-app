const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatRelativeTime = (isoDate: string): string => {
  const now = Date.now();
  const then = new Date(isoDate).getTime();

  if (Number.isNaN(then)) return '';

  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < MINUTE) return 'Только что';

  if (diffSec < HOUR) {
    const m = Math.floor(diffSec / MINUTE);
    return `${m} ${pluralize(m, 'минуту', 'минуты', 'минут')} назад`;
  }

  if (diffSec < DAY) {
    const h = Math.floor(diffSec / HOUR);
    return `${h} ${pluralize(h, 'час', 'часа', 'часов')} назад`;
  }

  if (diffSec < 7 * DAY) {
    const d = Math.floor(diffSec / DAY);
    return `${d} ${pluralize(d, 'день', 'дня', 'дней')} назад`;
  }

  return formatShortDate(isoDate);
};

export const formatShortDate = (isoDate: string): string => {
  const d = new Date(isoDate);

  if (Number.isNaN(d.getTime())) return isoDate;

  const MONTHS = [
    'янв.',
    'февр.',
    'мар.',
    'апр.',
    'мая',
    'июн.',
    'июл.',
    'авг.',
    'сент.',
    'окт.',
    'нояб.',
    'дек.',
  ];

  const now = new Date();
  const isCurrentYear = d.getFullYear() === now.getFullYear();

  return isCurrentYear
    ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const pluralize = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;

  return many;
};
