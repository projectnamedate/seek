import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Image() {
  const blades = [0, 60, 120, 180, 240, 300];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '76px',
          background: 'linear-gradient(130deg, #010101 0%, #071314 62%, #10282c 100%)',
          color: '#f6f6f5',
          fontFamily: 'Arial',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ color: '#95d2e6', fontSize: 28, letterSpacing: 6 }}>
            SEEKER-NATIVE BOUNTIES
          </div>
          <div style={{ color: '#cfe6e4', fontSize: 132, fontWeight: 900, letterSpacing: 18 }}>
            SEEK
          </div>
          <div style={{ color: '#99b3be', fontSize: 34 }}>
            Hunt. Capture. Win.
          </div>
        </div>
        <div
          style={{
            width: 250,
            height: 250,
            borderRadius: 64,
            background: '#010101',
            border: '6px solid #61afbd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 198,
              height: 198,
              borderRadius: 99,
              border: '8px solid #10282c',
            }}
          />
          {blades.map((deg, index) => (
            <div
              key={deg}
              style={{
                position: 'absolute',
                width: 66,
                height: 112,
                borderRadius: 14,
                background: index % 2 === 0 ? '#95d2e6' : '#61afbd',
                opacity: index === 3 ? 0.58 : 0.86,
                transform: `rotate(${deg}deg) translateY(-46px) skewY(18deg)`,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              width: 86,
              height: 86,
              borderRadius: 43,
              background: '#010101',
              border: '8px solid #cfe6e4',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 24,
              height: 24,
              borderRadius: 12,
              background: '#cfe6e4',
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
