export const getCardRadiusClass = (index: number, total: number): string => {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  if (isFirst && isLast) return 'rounded-2xl';
  if (isFirst) return 'rounded-t-2xl';
  if (isLast) return 'rounded-b-2xl';
  return '';
};
