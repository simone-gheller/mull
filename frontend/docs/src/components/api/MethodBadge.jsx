import { FONTS } from '@vextis/ui';

const TONE = {
  get: 'termGreen',
  post: 'blue',
  put: 'amber',
  patch: 'amber',
  delete: 'red',
};

export function MethodBadge({ T, method, size = 'sm' }) {
  const tone = TONE[method.toLowerCase()] ?? 'textMuted';
  const color = T[tone] ?? T.textMuted;
  const bg = T[`${tone}Bg`] ?? T.overlay;
  const border = T[`${tone}Border`] ?? T.border;

  return (
    <span style={{
      display: 'inline-block',
      textAlign: 'center',
      width: size === 'lg' ? '64px' : '48px',
      fontFamily: FONTS.mono,
      fontWeight: 600,
      fontSize: size === 'lg' ? '13px' : '10px',
      padding: size === 'lg' ? '4px 0' : '2px 0',
      borderRadius: '4px',
      color,
      background: bg,
      border: `1px solid ${border}`,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {method}
    </span>
  );
}
