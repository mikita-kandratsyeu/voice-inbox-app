const getUnits = (): { mb: string; gb: string; kb: string; b: string } => {
  try {
    const i18n = require('i18next').default;
    const lang: string = i18n?.language ?? 'en';
    if (lang.startsWith('ru')) {
      return { mb: 'МБ', gb: 'ГБ', kb: 'КБ', b: 'Б' };
    }
  } catch {
    // fallback to English
  }
  return { mb: 'MB', gb: 'GB', kb: 'KB', b: 'B' };
};

export const formatFileSize = (bytes: number): string => {
  const units = getUnits();

  if (bytes === 0) return `0 ${units.b}`;

  const mb = bytes / (1024 * 1024);

  if (mb >= 1000) {
    return `${(mb / 1000).toFixed(1)} ${units.gb}`;
  }

  if (mb >= 1) {
    return `${Math.round(mb)} ${units.mb}`;
  }

  const kb = bytes / 1024;
  return `${Math.round(kb)} ${units.kb}`;
};
