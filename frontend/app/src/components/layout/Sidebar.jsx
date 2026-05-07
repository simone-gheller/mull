import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme, NavItem, FONTS } from '@mull/ui';

const MAIN_NAV = [
  { icon: '▣', label: 'dashboard',    href: '/dashboard',              end: true },
  { icon: '◈', label: 'apps',          href: '/dashboard/apps' },
  { icon: '◇', label: 'parameters',   href: '/dashboard/parameters' },
  { icon: '▷', label: 'environments', href: '/dashboard/environments' },
  { icon: '≡', label: 'users',        href: '/dashboard/users' },
];

const ACCOUNT_NAV = [
  { icon: '◈', label: 'profile',         href: '/settings/profile' },
  { icon: '◇', label: 'security',        href: '/settings/security' },
  { icon: '▷', label: 'personal tokens', href: '/settings/tokens' },
];

export default function Sidebar() {
  const { T } = useTheme();
  const location = useLocation();

  const isSettings = location.pathname.startsWith('/settings');
  const [accountOpen, setAccountOpen] = useState(isSettings);

  useEffect(() => {
    if (isSettings) setAccountOpen(true);
  }, [isSettings]);

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

        {/* Account — expandable */}
        <button
          onClick={() => setAccountOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '7px 10px', borderRadius: '4px',
            border: 'none', background: 'transparent',
            cursor: 'pointer', transition: 'background 0.1s',
            ...(accountOpen || isSettings ? { background: T.elevated } : {}),
          }}
        >
          <span style={{ fontFamily: FONTS.mono, fontSize: '13px', color: isSettings ? T.textPrimary : T.textMuted, opacity: 0.8 }}>⊙</span>
          <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: isSettings ? T.textPrimary : T.textMuted, flex: 1, textAlign: 'left' }}>
            account
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted }}>
            {accountOpen ? '▾' : '▸'}
          </span>
        </button>

        {/* Account sub-items */}
        {accountOpen && (
          <div style={{ paddingLeft: '14px', marginTop: '2px' }}>
            {ACCOUNT_NAV.map(item => (
              <NavLink key={item.href} to={item.href} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <NavItem T={T} icon={item.icon} label={item.label} active={isActive} />
                )}
              </NavLink>
            ))}
          </div>
        )}

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
