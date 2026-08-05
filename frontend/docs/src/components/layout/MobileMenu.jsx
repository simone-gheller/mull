import { Link, useLocation } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { STATUS_URL } from '../../constants.js';
import { navLinkStyle } from './TopNav.jsx';

function mobileLinkStyle(T, active) {
  return {
    display: 'block',
    padding: '9px 10px',
    borderRadius: '5px',
    fontFamily: FONTS.mono,
    fontSize: '13px',
    color: T.textSecondary,
    textDecoration: 'none',
    ...navLinkStyle(T, active),
  };
}

// Always shows the same Docs/API/Changelog/Status links TopNav has — those disappear from the bar
// itself once the viewport gets too narrow (see GlobalStyles' 900px breakpoint), so this is the
// only way to move between top-level sections below that width. `children`, when given, is
// whatever page-specific nav sits below that (the docs guide sidebar, the API operation list).
export function MobileMenu({ T, open, onClose, children }) {
  const { pathname } = useLocation();
  if (!open) return null;

  const onDocs = pathname.startsWith('/docs');
  const onApi = pathname.startsWith('/api');
  const onChangelog = pathname === '/changelog';

  return (
    <div className="docs-mobile-layer">
      <button type="button" className="docs-mobile-backdrop" aria-label="Close menu" onClick={onClose} />
      <div className="docs-mobile-panel" style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: FONTS.display, fontWeight: 700, color: T.textPrimary }}>vextis</span>
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

        <nav style={{ display: 'grid', gap: '2px', padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>
          <Link to="/docs" onClick={onClose} style={mobileLinkStyle(T, onDocs)}>Docs</Link>
          <Link to="/api" onClick={onClose} style={mobileLinkStyle(T, onApi)}>API</Link>
          <Link to="/changelog" onClick={onClose} style={mobileLinkStyle(T, onChangelog)}>Changelog</Link>
          {/* Placeholder "#" until a real OpenStatus page exists — see status/README.md */}
          <a
            href={STATUS_URL || '#'}
            target={STATUS_URL ? '_blank' : undefined}
            rel={STATUS_URL ? 'noreferrer' : undefined}
            onClick={onClose}
            style={mobileLinkStyle(T, false)}
          >
            Status
          </a>
        </nav>

        {children && <div style={{ padding: '18px' }}>{children}</div>}
      </div>
    </div>
  );
}
