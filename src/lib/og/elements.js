const STAR_PATH = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

export function StarRow({ count = 5, size = 48, gap = 10, color = '#FBBF24' }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {Array.from({ length: count }, (_, index) => (
        <svg key={index} width={size} height={size} viewBox="0 0 24 24">
          <path fill={color} d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

export function QuoteIcon({ size = 160, color = 'rgba(255,255,255,0.16)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill={color}
        d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"
      />
      <path
        fill={color}
        d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"
      />
    </svg>
  );
}

export function NfcIcon({ size = 64, color = '#2A53E7' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
      <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
      <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
      <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
    </svg>
  );
}

export function LogoBadge({
  logoDataUrl,
  initials,
  size = 120,
  background = '#2A53E7',
  color = '#FFFFFF',
  ring = 'rgba(255,255,255,0.9)',
}) {
  const frame = {
    width: size,
    height: size,
    borderRadius: size / 2,
    border: `${Math.round(size / 20)}px solid ${ring}`,
  };

  if (logoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoDataUrl}
        alt=""
        width={size}
        height={size}
        style={{ ...frame, objectFit: 'cover', backgroundColor: '#FFFFFF' }}
      />
    );
  }

  return (
    <div
      style={{
        ...frame,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        color,
        fontSize: Math.round(size * 0.38),
        fontWeight: 800,
        letterSpacing: 2,
      }}
    >
      {initials}
    </div>
  );
}
