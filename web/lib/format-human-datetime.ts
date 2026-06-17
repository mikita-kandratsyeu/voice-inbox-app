const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

export type HumanDateTimeLabels = {
  justNow: string;
  todayAt: string;
  yesterdayAt: string;
  tomorrowAt: string;
  expired: string;
};

export function toIntlLocale(locale: string): string {
  return locale === 'ru' ? 'ru-RU' : 'en-US';
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

function isTomorrow(date: Date, now: Date): boolean {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatWeekdayAt(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatSmartAbsolute(date: Date, now: Date, locale: string): string {
  const intlLocale = toIntlLocale(locale);
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
      : {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        };

  return new Intl.DateTimeFormat(intlLocale, options).format(date);
}

function interpolate(template: string, time: string): string {
  return template.replace('{time}', time);
}

export function formatAbsoluteDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

/** Past-oriented label: "2 hours ago", "yesterday at 8:54 PM", "Jun 16 at 8:54 PM". */
export function formatHumanPastDateTime(
  date: Date,
  now: Date,
  locale: string,
  labels: HumanDateTimeLabels,
): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    return formatSmartAbsolute(date, now, locale);
  }

  if (diffMs < MS_MINUTE) {
    return labels.justNow;
  }

  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(locale), { numeric: 'auto' });

  if (diffMs < MS_HOUR) {
    const minutes = Math.floor(diffMs / MS_MINUTE);
    return rtf.format(-minutes, 'minute');
  }

  if (isSameDay(date, now)) {
    const hours = Math.floor(diffMs / MS_HOUR);
    if (hours < 6) {
      return rtf.format(-hours, 'hour');
    }
    return interpolate(labels.todayAt, formatTime(date, locale));
  }

  if (isYesterday(date, now)) {
    return interpolate(labels.yesterdayAt, formatTime(date, locale));
  }

  const diffDays = Math.floor(diffMs / MS_DAY);
  if (diffDays < 7) {
    return formatWeekdayAt(date, locale);
  }

  return formatSmartAbsolute(date, now, locale);
}

/** Future-oriented label: "in 2 hours", "tomorrow at 8:54 PM", "Jun 17 at 8:54 PM". */
export function formatHumanFutureDateTime(
  date: Date,
  now: Date,
  locale: string,
  labels: HumanDateTimeLabels,
): string {
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) {
    return labels.expired;
  }

  if (diffMs < MS_MINUTE) {
    return labels.justNow;
  }

  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(locale), { numeric: 'auto' });

  if (diffMs < MS_HOUR) {
    const minutes = Math.ceil(diffMs / MS_MINUTE);
    return rtf.format(minutes, 'minute');
  }

  if (isSameDay(date, now)) {
    const hours = Math.ceil(diffMs / MS_HOUR);
    if (hours < 6) {
      return rtf.format(hours, 'hour');
    }
    return interpolate(labels.todayAt, formatTime(date, locale));
  }

  if (isTomorrow(date, now)) {
    return interpolate(labels.tomorrowAt, formatTime(date, locale));
  }

  const diffDays = Math.ceil(diffMs / MS_DAY);
  if (diffDays < 7) {
    return formatWeekdayAt(date, locale);
  }

  return formatSmartAbsolute(date, now, locale);
}
