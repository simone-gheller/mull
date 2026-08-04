import { FONTS, Badge } from '@vextis/ui';

// Purpose-built rather than @vextis/ui's Card: this is a clickable nav tile (large heading +
// description, whole tile is a button) — Card renders a bordered panel with a small mono title
// bar, a different pattern meant for labeled content panels, not navigation.
export function DocCard({ T, title, body, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="doc-card"
      style={{
        textAlign: 'left',
        padding: '16px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '6px',
        cursor: 'pointer',
        minHeight: '126px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ fontFamily: FONTS.display, fontSize: '15px', color: T.textPrimary }}>
          {title}
        </h3>
        {badge === 'soon' && <Badge T={T} variant="default">soon</Badge>}
      </div>
      <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6 }}>
        {body}
      </p>
    </button>
  );
}
