import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme, FONTS } from '@vextis/ui';
import { Command, CircleUserRound, Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function UserMenu({ T, user, logout, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayName = user?.user_metadata?.display_name || '';
  const email = user?.email || '';
  const initials = (() => {
    if (displayName) return displayName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return null;
  })();

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Your profile"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '28px', height: '28px', borderRadius: '5px',
          border: `1px solid ${T.border}`,
          background: open ? T.elevated : T.overlay,
          cursor: 'pointer', transition: 'all 0.1s', flexShrink: 0,
        }}
      >
        {initials ? (
          <span style={{ fontFamily: FONTS.mono, fontSize: '10px', fontWeight: 600, color: T.termGreen, letterSpacing: '0.02em' }}>
            {initials}
          </span>
        ) : (
          <CircleUserRound size={15} strokeWidth={1.5} color={T.textMuted} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', ...(dropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }), right: 0,
          minWidth: '200px', zIndex: 100,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', overflow: 'hidden',
          boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
        }}>
          <div style={{ padding: '12px', borderBottom: `1px solid ${T.border}`, background: T.overlay }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>{displayName}</div>
            <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>{email}</div>
          </div>
          {[
            { label: 'profile settings', href: '/account/profile' },
            { label: 'security',         href: '/account/security' },
            { label: 'personal tokens',  href: '/account/tokens' },
          ].map(({ label, href }) => (
            <NavLink key={href} to={href} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
              {({ isActive }) => (
                <div style={{
                  padding: '8px 12px', fontFamily: FONTS.mono, fontSize: '12px',
                  color: isActive ? T.textPrimary : T.textSecondary, cursor: 'pointer',
                  background: isActive ? T.elevated : 'transparent',
                }}>
                  {label}
                </div>
              )}
            </NavLink>
          ))}
          <div style={{ height: '1px', background: T.border }} />
          <button
            onClick={() => { setOpen(false); logout(); }}
            style={{
              width: '100%', padding: '8px 12px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: FONTS.mono, fontSize: '12px', color: T.red,
            }}
          >
            logout
          </button>
        </div>
      )}
    </div>
  );
}

const ICON_BTN = (T) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'none', border: `1px solid ${T.border}`, borderRadius: '4px',
  cursor: 'pointer', color: T.textMuted, padding: '4px 7px',
  transition: 'all 0.1s',
});

export default function Header() {
  const { T, toggle, mode } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header style={{
      height: '44px', flexShrink: 0,
      background: T.surface, borderBottom: `1px solid ${T.border}`,
      padding: '0 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('app:cmd'))}
          title="Command palette (⌘K)"
          style={ICON_BTN(T)}
        >
          <Command size={14} strokeWidth={1.75} />
        </button>
        <button title="What's new" style={ICON_BTN(T)}>
          <Megaphone size={14} strokeWidth={1.75} />
        </button>
        <button
          onClick={toggle}
          aria-label={mode === 'dark' ? 'switch to light mode' : 'switch to dark mode'}
          style={{ ...ICON_BTN(T), padding: '4px 10px', fontSize: '11px', fontFamily: FONTS.mono }}
        >
          {mode === 'dark' ? '☀' : '●'}
        </button>
        <UserMenu T={T} user={user} logout={logout} />
      </div>
    </header>
  );
}
