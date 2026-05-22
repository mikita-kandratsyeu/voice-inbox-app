/** Voice Inbox AI — shared palette for transactional / share emails (aligned with app & landing). */
export const shareEmailBrand = {
  gradientStart: '#3b82f6',
  gradientEnd: '#06b6d4',
  ink: '#0f172a',
  body: '#374151',
  muted: '#64748b',
  faint: '#94a3b8',
  canvas: '#e8edf5',
  card: '#ffffff',
  border: '#e2e8f0',
  surface: '#f8fafc',
  speakerBorder: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'] as const,
  link: '#2563eb',
  codeBg: '#f1f5f9',
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
} as const;

export type ShareEmailBrand = typeof shareEmailBrand;
