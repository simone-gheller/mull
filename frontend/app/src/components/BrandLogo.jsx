const SIZES = {
  sm: { prompt: 12, wordmark: 14, tagline: 9, gap: 3 },
  md: { prompt: 16, wordmark: 18, tagline: 11, gap: 4 },
  lg: { prompt: 22, wordmark: 26, tagline: 13, gap: 6 },
};

const MONO = "'JetBrains Mono', 'Fira Code', monospace";

export default function BrandLogo({
  size = 'sm',
  showTagline = false,
  showCursor = false,
  animatedCursor = false,
  className,
}) {
  const s = SIZES[size] ?? SIZES.sm;

  return (
    <div className={className} aria-label="vextis" style={{ display: 'inline-flex', flexDirection: 'column', gap: s.gap + 'px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: MONO, lineHeight: 1 }}>
        <span style={{ fontSize: s.prompt + 'px', color: 'var(--color-brand)', marginRight: '0.35em', userSelect: 'none' }}>
          &gt;
        </span>
        <span style={{ fontSize: s.wordmark + 'px', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', fontWeight: 500 }}>
          vextis
        </span>
        {showCursor && (
          <span
            className={animatedCursor ? 'brand-cursor' : undefined}
            style={{ fontSize: s.wordmark + 'px', color: 'var(--color-brand)', marginLeft: '1px', userSelect: 'none' }}
          >
            |
          </span>
        )}
      </div>
      {showTagline && (
        <div style={{ fontFamily: MONO, fontSize: s.tagline + 'px', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
          secure by default
        </div>
      )}
    </div>
  );
}
