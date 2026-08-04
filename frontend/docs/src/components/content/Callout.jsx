import { FONTS } from '@vextis/ui';

// Purpose-built rather than @vextis/ui's Card: a callout needs a full-height left accent
// stripe on a plain block, while Card's accent is a small pill next to an optional title bar —
// different visual pattern, not a drop-in swap.
export function Callout({ T, children, type = 'info' }) {
  const tone = type === 'warning'
    ? { color: T.amber, border: T.amberBorder, bg: T.amberBg }
    : { color: T.termGreen, border: T.termGreenBorder, bg: T.termGreenBg };

  return (
    <div style={{
      border: `1px solid ${tone.border}`,
      borderLeft: `3px solid ${tone.color}`,
      background: tone.bg,
      borderRadius: '6px',
      padding: '13px 15px',
      fontFamily: FONTS.display,
      fontSize: '13px',
      lineHeight: 1.65,
      color: T.textSecondary,
    }}>
      {children}
    </div>
  );
}
