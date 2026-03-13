const UNITS = { mb: 'MB', gb: 'GB', kb: 'KB', b: 'B' } as const;

export const formatFileSize = (bytes: number): string => {
  const units = UNITS;

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
