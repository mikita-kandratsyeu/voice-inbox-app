import { ImageResponse } from 'next/og';

export const alt = 'Voice Inbox AI — AI-Powered Voice Notes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 1032 1032" fill="none">
            <defs>
              <linearGradient
                id="og-icon-gradient"
                x1="516"
                y1="0"
                x2="516"
                y2="1024"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#3B82F6" />
                <stop offset="1" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <rect x="4" width="1024" height="1024" rx="320" fill="url(#og-icon-gradient)" />
            <path d="M507 639H527V724H507V639Z" fill="white" />
            <path
              d="M437 739C437 730.716 443.716 724 452 724H582C590.284 724 597 730.716 597 739C597 747.284 590.284 754 582 754H452C443.716 754 437 747.284 437 739Z"
              fill="white"
            />
            <circle cx="516" cy="512" r="144" stroke="white" strokeWidth="40" />
            <circle cx="762" cy="266" r="30" fill="#10B981" />
            <circle
              cx="762"
              cy="266"
              r="52.5"
              stroke="#10B981"
              strokeOpacity="0.4"
              strokeWidth="45"
            />
          </svg>
        </div>
        <span style={{ fontSize: 48, fontWeight: 700, color: 'white' }}>Voice Inbox AI</span>
      </div>
      <p
        style={{
          fontSize: 24,
          color: 'rgba(255,255,255,0.8)',
          maxWidth: 600,
          textAlign: 'center',
        }}
      >
        AI-Powered Voice Notes. Private. Fast. Always available.
      </p>
    </div>,
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
      },
    },
  );
}
