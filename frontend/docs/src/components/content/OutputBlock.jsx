import { FONTS } from '@vextis/ui';

export function OutputBlock({ T, children }) {
  return (
    <pre style={{
      margin: 0,
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: '6px',
      padding: '11px 13px',
      overflowX: 'auto',
      fontFamily: FONTS.mono,
      fontSize: '12px',
      lineHeight: 1.6,
      color: T.textSecondary,
    }}>
      <code>{children}</code>
    </pre>
  );
}
