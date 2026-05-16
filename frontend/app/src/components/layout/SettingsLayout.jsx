import { Outlet, NavLink } from 'react-router-dom';
import { useTheme, FONTS, Badge } from '@vextis/ui';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../settings/Avatar';
import Header from './Header';

function SectionLabel({ children, T }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '12px 10px 6px',
      fontFamily: FONTS.mono, fontSize: '9px',
      color: T.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase',
    }}>
      <span style={{ color: T.termGreen }}>//</span>
      {children}
    </div>
  );
}

function SettingsSidebar() {
  const { T } = useTheme();
  const { user, orgs, orgId } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'me';
  const email = user?.email || '';
  const activeOrg = orgs.find(o => o.id === orgId);
  const orgName = activeOrg?.name ?? 'workspace';
  const role = activeOrg?.role?.toLowerCase() ?? 'developer';

  const roleVariant = { owner: 'warning', admin: 'info', developer: 'success', viewer: 'default' }[role] ?? 'default';

  return (
    <aside style={{
      width: '220px', flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* User mini */}
      <div style={{
        padding: '16px 12px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <Avatar name={displayName} size={32} sub={email} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto' }}>
        <SectionLabel T={T}>organization</SectionLabel>
        <NavLink to={`/settings/org`} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 10px', borderRadius: '4px',
              background: isActive ? T.elevated : 'transparent',
              transition: 'all 0.1s',
            }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: '13px', color: isActive ? T.textPrimary : T.textMuted, opacity: 0.7 }}>▣</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: isActive ? T.textPrimary : T.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {orgName}
              </span>
              <Badge T={T} variant={roleVariant}>{role}</Badge>
            </div>
          )}
        </NavLink>
      </nav>

      {/* Back link */}
      <div style={{ padding: '12px', borderTop: `1px solid ${T.border}` }}>
        <NavLink to="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 10px', borderRadius: '4px', cursor: 'pointer',
            fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted,
            transition: 'color 0.1s',
          }}>
            ← dashboard
          </div>
        </NavLink>
      </div>
    </aside>
  );
}

export default function SettingsLayout() {
  const { T } = useTheme();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
      <SettingsSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', maxWidth: '860px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
