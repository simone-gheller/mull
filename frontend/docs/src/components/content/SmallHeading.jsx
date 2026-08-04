import { FONTS } from '@vextis/ui';

export function SmallHeading({ T, children, id }) {
  return (
    <h2 id={id} style={{
      fontFamily: FONTS.display,
      fontSize: '20px',
      letterSpacing: '-0.02em',
      color: T.textPrimary,
      marginBottom: '12px',
      scrollMarginTop: '78px',
    }}>
      {children}
    </h2>
  );
}
