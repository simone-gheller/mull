import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme, Btn, FONTS } from '@mull/ui';
import { Building2, User, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function OrgSwitcher({ T }) {
  const { orgs, orgId, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const orgName = orgs.find(o => o.id === orgId)?.name ?? '…';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: open ? T.elevated : 'transparent',
          border: `1px solid ${open ? T.border : 'transparent'}`,
          borderRadius: '4px', padding: '4px 8px',
          cursor: 'pointer', transition: 'all 0.1s',
        }}
      >
        <Building2 size={14} color={T.termGreen} strokeWidth={1.5} />
        <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {orgName}
        </span>
        <ChevronsUpDown size={13} strokeWidth={1.5} color={T.textMuted} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: '200px', zIndex: 100,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', overflow: 'hidden',
          boxShadow: `0 4px 16px ${T.shadow ?? 'rgba(0,0,0,0.3)'}`,
        }}>
          <div style={{ padding: '6px 10px 4px', fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            organizations
          </div>
          {orgs.map(org => (
            <div
              key={org.id}
              onClick={() => { switchOrg(org.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', cursor: 'pointer',
                background: org.id === orgId ? T.elevated : 'transparent',
                borderTop: `1px solid ${T.border}`,
                transition: 'background 0.1s',
              }}
            >
              <Building2 size={13} color={T.termGreen} strokeWidth={1.5} />
              <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {org.name}
              </span>
              {org.id === orgId && (
                <span style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.termGreen }}>active</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { T, toggle, mode } = useTheme();
  const { user, logout } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'me';

  return (
    <header style={{
      height: '48px', flexShrink: 0,
      background: T.surface, borderBottom: `1px solid ${T.border}`,
      padding: '0 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Left — org switcher + display name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <OrgSwitcher T={T} />
        <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
          {displayName}
        </span>
      </div>

      {/* Right — theme toggle + user avatar + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={toggle} aria-label={mode === 'dark' ? 'switch to light mode' : 'switch to dark mode'} style={{
          background: 'none', border: `1px solid ${T.border}`, borderRadius: '4px',
          cursor: 'pointer', fontFamily: FONTS.mono, fontSize: '11px',
          color: T.textMuted, padding: '4px 10px',
        }}>
          {mode === 'dark' ? '☀' : '●'}
        </button>
        <NavLink to="/settings/profile" aria-label="profile settings" style={{
          textDecoration: 'none', display: 'flex', alignItems: 'center',
          padding: '4px', borderRadius: '4px', border: `1px solid ${T.border}`,
          color: T.textMuted, transition: 'all 0.1s',
        }}>
          <User size={16} strokeWidth={1.5} />
        </NavLink>
        <Btn T={T} variant="secondary" size="sm" onClick={logout}>logout</Btn>
      </div>
    </header>
  );
}
