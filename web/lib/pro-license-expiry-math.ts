/** UTC calendar math for Pro license grants (must match `redeemProLicenseKey`). */

export function addCalendarMonthsUtc(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) {
    d.setUTCDate(0);
  }
  return d;
}

export function addUtcDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * End of the period this key would add if activation happened at `consumedAt` with no stacking
 * (does not match stacked IAP / another key — see DeviceProEntitlement for live device expiry).
 */
export function computeNominalGrantEndUtc(
  consumedAt: Date,
  durationMonths: number,
  durationDays: number | null,
): Date {
  if (durationDays != null) {
    return addUtcDays(consumedAt, durationDays);
  }
  return addCalendarMonthsUtc(consumedAt, durationMonths);
}
