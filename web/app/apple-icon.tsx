import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = { width: 180, height: 180 };

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: 42,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #3B82F6 0%, #06B6D4 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            border: '10px solid #ffffff',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            width: 10,
            height: 22,
            marginTop: -2,
            background: '#ffffff',
            borderRadius: 2,
          }}
        />
        <div
          style={{
            width: 38,
            height: 9,
            marginTop: 2,
            background: '#ffffff',
            borderRadius: 5,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 38,
          right: 38,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: '#10B981',
        }}
      />
    </div>,
    { ...size },
  );
}
