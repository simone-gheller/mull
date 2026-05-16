import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, FONTS } from '@vextis/ui';
import { useAuth } from '../context/AuthContext';

/**
 * OAuthCallback
 *
 * Landing page after a Supabase OAuth redirect (e.g. Google SSO).
 * Supabase exchanges the `code` param for a session and fires
 * `onAuthStateChange(SIGNED_IN)` inside AuthContext, which calls
 * /auth/me and populates `user` + `orgs`.
 *
 * We just wait for the AuthContext to settle, then redirect.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const { T } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', {
        replace: true,
        state: { error: 'Authentication failed. Please try again.' },
      });
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Spinner */}
      <div style={{
        width: '32px',
        height: '32px',
        border: `2px solid ${T.border}`,
        borderTopColor: T.termGreen,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <span style={{
        fontFamily: FONTS.mono,
        fontSize: '12px',
        color: T.textMuted,
      }}>
        completing sign in…
      </span>
    </div>
  );
}
