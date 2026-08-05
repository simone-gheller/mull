import { FONTS } from '@vextis/ui';

// Short local screen-capture clips (no external video host) — same dashboard-illustration role
// as Screenshot, for a flow that reads better as motion than a single frame. Assets live in
// public/screenshots/ alongside stills.
export function VideoEmbed({ T, src, caption }) {
  return (
    <figure style={{ margin: '18px 0 22px' }}>
      <div style={{
        border: `1px solid ${T.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        background: T.surface,
        lineHeight: 0,
      }}>
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
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
