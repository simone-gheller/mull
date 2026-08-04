import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme, FONTS, Btn } from '@vextis/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import apiService from '../services/api';

export default function InviteAcceptPage() {
  const { T } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { user, switchOrg, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | auto-accepting | mismatch | sso-required | error

  useEffect(() => {
    if (!token) { setLoadError('Invalid invitation link.'); setStatus('error'); return; }
    apiService.getInviteByToken(token)
      .then(data => setInvite(data))
      .catch(e => {
        setLoadError(e.response?.data?.message || 'Invitation not found or expired.');
        setStatus('error');
      });
  }, [token]);

  // Once we have both invite info and auth has resolved
  useEffect(() => {
    if (!invite || authLoading) return;

    if (!user) {
      navigate(`/signup?invite=${token}&email=${encodeURIComponent(invite.email)}`, { replace: true });
      return;
    }

    if (user.email !== invite.email) {
      setStatus('mismatch');
      return;
    }

    // Logged in + email matches → accept immediately
    setStatus('auto-accepting');
    apiService.acceptInvite(token)
      .then(result => {
        sessionStorage.setItem('pending_toast', JSON.stringify({
          msg: `You've joined ${result.orgName}`,
          sub: result.role.toLowerCase(),
          variant: 'success',
        }));
        switchOrg(result.orgId);
        navigate('/dashboard', { replace: true });
      })
      .catch(e => {
        if (e.response?.data?.code === 'ORG_SSO_REQUIRED') {
          setStatus('sso-required');
          return;
        }
        setLoadError(e.response?.data?.message || 'Failed to accept invitation.');
        setStatus('error');
      });
  }, [invite, user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const continueWithSso = async () => {
    const providerId = invite?.sso?.providerId;
    if (!providerId) return;
    const { data } = await supabase.auth.signInWithSSO({
      providerId,
      options: { redirectTo: `${window.location.origin}/oauth/callback` },
    });
    if (data?.url) window.location.href = data.url;
  };

  const containerStyle = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: T.bg, padding: '24px',
  };

  const cardStyle = {
    width: '100%', maxWidth: '420px',
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: '8px', padding: '36px 32px',
    display: 'flex', flexDirection: 'column', gap: '20px',
  };

  if (status === 'loading' || status === 'auto-accepting') {
    return (
      <div style={containerStyle}>
        <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textMuted }}>
          {status === 'auto-accepting' ? 'accepting…' : 'loading…'}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '22px', color: T.textMuted, textAlign: 'center' }}>◇</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '15px', color: T.textPrimary, marginBottom: '6px' }}>
              Invitation unavailable
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted }}>{loadError}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => navigate('/login')}>go to login</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'mismatch') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '22px', color: T.textMuted, textAlign: 'center' }}>◇</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '15px', color: T.textPrimary, marginBottom: '8px' }}>
              Wrong account
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted, lineHeight: 1.6 }}>
              You're signed in as <span style={{ fontFamily: FONTS.mono, color: T.textSecondary }}>{user.email}</span> but this invite was sent to{' '}
              <span style={{ fontFamily: FONTS.mono, color: T.textSecondary }}>{invite.email}</span>.
            </div>
          </div>
          <Btn T={T} variant="secondary" size="md" onClick={async () => {
            await supabase.auth.signOut();
            navigate(`/login?invite=${token}`);
          }}>
            sign out and use correct account
          </Btn>
        </div>
      </div>
    );
  }

  if (status === 'sso-required') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '22px', color: T.textMuted, textAlign: 'center' }}>◇</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '15px', color: T.textPrimary, marginBottom: '8px' }}>
              Company SSO required
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted, lineHeight: 1.6 }}>
              {invite.orgName} requires company SSO before this invite can be accepted.
            </div>
          </div>
          <Btn T={T} variant="primary" size="md" onClick={continueWithSso}>
            continue with {invite.orgName} SSO
          </Btn>
        </div>
      </div>
    );
  }

}
