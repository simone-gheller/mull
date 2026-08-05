import { FONTS } from '@vextis/ui';

// Illustrates a dashboard/web-app concept with a real capture of frontend/app — keeps CLI/API
// detail (CommandBlock/OutputBlock, the /api reference) out of these pages, and the dashboard's
// own UI out of the CLI/API ones. Assets live in public/screenshots/.
export function Screenshot({ T, src, alt, caption }) {
  return (
    <figure style={{ margin: '18px 0 22px' }}>
      <div style={{
        border: `1px solid ${T.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        background: T.surface,
        lineHeight: 0,
      }}>
        <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: 'auto' }} loading="lazy" />
      </div>
      {caption && (
        <figcaption style={{
          fontFamily: FONTS.mono,
          fontSize: '11px',
          color: T.textMuted,
          marginTop: '8px',
          textAlign: 'center',
        }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
