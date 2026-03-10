export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б';

  const mb = bytes / (1024 * 1024);

  if (mb >= 1000) {
    return `${(mb / 1000).toFixed(1)} ГБ`;
  }

  if (mb >= 1) {
    return `${Math.round(mb)} МБ`;
  }

  const kb = bytes / 1024;
  return `${Math.round(kb)} КБ`;
};
