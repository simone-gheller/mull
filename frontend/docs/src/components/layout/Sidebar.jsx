import { Link, useLocation } from 'react-router-dom';
import { FONTS, NavItem, useScrollActiveIntoView } from '@vextis/ui';
import { DOC_GROUPS } from '../../content/navigation.js';

export function Sidebar({ T, onSelect }) {
  const { pathname } = useLocation();
  const scrollRef = useScrollActiveIntoView(pathname);

  return (
    <aside className="docs-sidebar" style={{ borderRight: `1px solid ${T.border}` }}>
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10px',
        color: T.termGreen,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        marginBottom: '20px',
        flexShrink: 0,
      }}>
        // docs
      </div>
      <div ref={scrollRef} className="docs-sidebar-scroll ui-scroll-fade">
        {DOC_GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom: '22px' }}>
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: '10px',
              color: T.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '8px',
            }}>
              {group.title}
            </div>
            <div style={{ display: 'grid', gap: '2px' }}>
              {group.pages.map(page => (
                <Link
                  key={page.path}
                  to={page.path}
                  onClick={() => onSelect?.()}
                  style={{ textDecoration: 'none' }}
                  data-nav-active={page.path === pathname}
                >
                  <NavItem
                    T={T}
                    label={page.title}
                    active={page.path === pathname}
                    badge={page.badge === 'soon' ? 'soon' : undefined}
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
