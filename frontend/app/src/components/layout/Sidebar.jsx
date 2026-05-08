import { NavLink } from 'react-router-dom';
import { useTheme, NavItem, FONTS } from '@mull/ui';

const MAIN_NAV = [
  { icon: '▣', label: 'dashboard',    href: '/dashboard',              end: true },
  { icon: '◈', label: 'apps',          href: '/dashboard/apps' },
  { icon: '◇', label: 'parameters',   href: '/dashboard/parameters' },
  { icon: '▷', label: 'environments', href: '/dashboard/environments' },
];


export default function Sidebar() {
  const { T } = useTheme();

  return (
    <aside style={{
      width: '200px', flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      background: T.surface, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{
        padding: '14px 12px 12px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: '9px',
      }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '5px',
          background: T.elevated, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', color: T.textPrimary, flexShrink: 0,
        }}>▣</div>
        <div>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '14px', color: T.textPrimary, letterSpacing: '-0.01em' }}>
            mull
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted, letterSpacing: '0.05em' }}>
            secure by default
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {/* Main items */}
        {MAIN_NAV.map(item => (
          <NavLink key={item.href} to={item.href} end={item.end} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <NavItem T={T} icon={item.icon} label={item.label} active={isActive} />
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div style={{ height: '1px', background: T.border, margin: '8px 2px' }} />

        {/* Organization */}
        <NavLink to="/settings/org" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <NavItem T={T} icon="▣" label="settings" active={isActive} />
          )}
        </NavLink>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted }}>
          mull v1.0
        </div>
      </div>
    </aside>
  );
}
