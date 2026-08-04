import { FONTS } from '@vextis/ui';

export function PageTitle({ T, label, title, children }) {
  return (
    <header style={{ marginBottom: '26px' }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10px',
        color: T.termGreen,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: '10px',
      }}>
        {label}
      </div>
      <h1 style={{
        fontFamily: FONTS.display,
        fontSize: '38px',
        lineHeight: 1.08,
        letterSpacing: '-0.035em',
        color: T.textPrimary,
        marginBottom: '12px',
      }}>
        {title}
      </h1>
      {children && (
        <p style={{
          fontFamily: FONTS.display,
          fontSize: '15px',
          color: T.textSecondary,
          lineHeight: 1.75,
          maxWidth: '660px',
        }}>
          {children}
        </p>
      )}
    </header>
  );
}
