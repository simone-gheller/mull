import { FONTS } from '@vextis/ui';
import { Sidebar } from './Sidebar.jsx';

export function MobileMenu({ T, open, onClose }) {
  if (!open) return null;

  return (
    <div className="docs-mobile-layer">
      <button type="button" className="docs-mobile-backdrop" aria-label="Close menu" onClick={onClose} />
      <div className="docs-mobile-panel" style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: FONTS.display, fontWeight: 700, color: T.textPrimary }}>vextis docs</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: '4px',
              color: T.textMuted,
              fontFamily: FONTS.mono,
              fontSize: '11px',
              padding: '5px 8px',
            }}
          >
            close
          </button>
        </div>
        <div style={{ padding: '18px' }}>
          <Sidebar T={T} onSelect={onClose} />
        </div>
      </div>
    </div>
  );
}
