import { Link } from 'react-router-dom';
import { Btn, FONTS } from '@vextis/ui';
import { APP_URL, LANDING_URL } from '../../constants.js';
import { SearchButton } from '../search/SearchButton.jsx';

export function TopNav({ T, onSearchOpen, onMenuOpen }) {
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
          <Link to="/">Docs</Link>
          <Link to="/api-basics">API</Link>
          <Link to="/changelog">Changelog</Link>
        </div>
        <div className="docs-actions">
          <a href={`${APP_URL}/login`} style={{ textDecoration: 'none' }}><Btn T={T} variant="secondary" size="sm">Sign in</Btn></a>
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
