import { Link, useLocation } from 'react-router-dom';
import { Btn, FONTS } from '@vextis/ui';
import { APP_URL, LANDING_URL, STATUS_URL } from '../../constants.js';
import { SearchButton } from '../search/SearchButton.jsx';

export function navLinkStyle(T, active) {
  return active
    ? { color: T.termGreen, background: T.termGreenBg, borderRadius: '5px' }
    : undefined;
}

export function TopNav({ T, onSearchOpen, onMenuOpen }) {
  const { pathname } = useLocation();
  const onDocs = pathname.startsWith('/docs');
  const onApi = pathname.startsWith('/api');
  const onChangelog = pathname === '/changelog';

  return (
    <nav className="docs-top-nav" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
      <div className="docs-nav-inner">
        <a href={LANDING_URL} className="docs-brand" style={{ textDecoration: 'none' }}>
          <span style={{
            width: '28px',
            height: '28px',
            borderRadius: '5px',
            border: `1px solid ${T.border}`,
            background: T.elevated,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.termGreen,
            fontFamily: FONTS.mono,
            fontSize: '12px',
          }}>
            &gt;_
          </span>
          <span style={{ fontFamily: FONTS.display, fontWeight: 700, color: T.textPrimary, fontSize: '16px' }}>
            vextis
          </span>
        </a>
        <div className="docs-search-wrap">
          <SearchButton T={T} onOpen={onSearchOpen} />
        </div>
        <div className="docs-top-links">
          <Link to="/docs" style={navLinkStyle(T, onDocs)}>Docs</Link>
          <Link to="/api" style={navLinkStyle(T, onApi)}>API</Link>
          <Link to="/changelog" style={navLinkStyle(T, onChangelog)}>Changelog</Link>
          {/* Placeholder "#" until a real OpenStatus page exists — see status/README.md */}
          <a href={STATUS_URL || '#'} target={STATUS_URL ? '_blank' : undefined} rel={STATUS_URL ? 'noreferrer' : undefined}>Status</a>
        </div>
        <div className="docs-actions">
          <a href={`${APP_URL}/signup`} style={{ textDecoration: 'none' }}><Btn T={T} variant="primary" size="sm">Get started</Btn></a>
        </div>
        <button
          type="button"
          className="docs-menu-button"
          onClick={onMenuOpen}
          style={{
            display: 'none',
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.textPrimary,
            borderRadius: '5px',
            fontFamily: FONTS.mono,
            fontSize: '11px',
            padding: '6px 9px',
          }}
        >
          menu
        </button>
      </div>
    </nav>
  );
}
