import { useTheme, Btn, FONTS } from '@mull/ui';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { T, toggle, mode } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header style={{
      height: '48px', flexShrink: 0,
      background: T.surface, borderBottom: `1px solid ${T.border}`,
      padding: '0 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
        {user?.displayName || user?.email?.split('@')[0] || 'me'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={toggle} style={{
          background: 'none', border: `1px solid ${T.border}`, borderRadius: '4px',
          cursor: 'pointer', fontFamily: FONTS.mono, fontSize: '11px',
          color: T.textMuted, padding: '4px 10px',
        }}>
          {mode === 'dark' ? '☀' : '●'}
        </button>
        <Btn T={T} variant="secondary" size="sm" onClick={logout}>logout</Btn>
      </div>
    </header>
  );
}
