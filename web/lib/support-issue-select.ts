/** Columns for admin support inbox list (excludes heavy `appLogs`). */
export const supportIssueListSelect = {
  id: true,
  referenceNumber: true,
  deviceId: true,
  email: true,
  subject: true,
  message: true,
  diagnostics: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  proLicenseEmailSentAt: true,
  proLicenseDurationMonths: true,
  proLicenseDurationDays: true,
} as const;
