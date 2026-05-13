import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme, Btn, FONTS } from '@mull/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import apiService from '../services/api';
import FormInput from '../components/ui/FormInput';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

function GitHubLogo({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        fill={color}
        d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18A10.93 10.93 0 0 1 12 6.02c.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.07.78 2.15v3.16c0 .31.21.67.79.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  );
}

export default function Login() {
  const { T } = useTheme();
  const { login, loading, error, switchOrg } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const from = location.state?.from?.pathname || '/dashboard';

  const [inviteInfo, setInviteInfo] = useState(null);
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [discovery, setDiscovery] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredSocial, setHoveredSocial] = useState(null);

  useEffect(() => {
    if (!inviteToken) return;
    apiService.getInviteByToken(inviteToken)
      .then(data => setInviteInfo(data))
      .catch(() => {});
  }, [inviteToken]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const finishInvite = async () => {
    if (!inviteToken) return;
    try {
      const accepted = await apiService.acceptInvite(inviteToken);
      sessionStorage.setItem('pending_toast', JSON.stringify({
        msg: `You've joined ${accepted.orgName}`,
        sub: accepted.role.toLowerCase(),
        variant: 'success',
      }));
      switchOrg(accepted.orgId);
    } catch {
      // ignore — user lands on dashboard in their existing org
    }
  };

  const onDiscover = async (data) => {
    setSubmitting(true);
    setLocalError(null);
    setEmail(data.email);
    try {
      const result = await apiService.discoverLogin(data.email);
      setDiscovery(result);
      if (result.sso?.available) {
        setStep('sso');
      } else {
        setStep('password');
      }
    } catch (e) {
      setLocalError(e.response?.data?.message || 'Unable to continue');
    } finally {
      setSubmitting(false);
    }
  };

  const onPasswordSubmit = async (event) => {
    event.preventDefault();
    if (!password) return;
    setSubmitting(true);
    const result = await login({ email, password });
    setSubmitting(false);
    if (!result.success) return;
    await finishInvite();
    navigate(from, { replace: true });
  };

  const handleOAuth = (provider) => {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/oauth/callback` },
    });
  };

  const handleSso = async () => {
    const providerId = discovery?.sso?.providerId;
    if (!providerId) return;
    setSubmitting(true);
    setLocalError(null);
    const { data, error: ssoError } = await supabase.auth.signInWithSSO({
      providerId,
      options: { redirectTo: `${window.location.origin}/oauth/callback` },
    });
    setSubmitting(false);
    if (ssoError) {
      setLocalError(ssoError.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
  };

  const resetEmail = () => {
    setStep('email');
    setDiscovery(null);
    setPassword('');
    setLocalError(null);
  };

  const socialButtonStyle = (key, extra = {}) => {
    const hovered = hoveredSocial === key;
    return {
      width: '100%',
      minHeight: '36px',
      padding: '8px',
      borderRadius: '4px',
      background: hovered ? T.overlay : 'transparent',
      border: `1px solid ${hovered ? T.borderHover : T.border}`,
      cursor: 'pointer',
      fontFamily: FONTS.mono,
      fontSize: '11px',
      color: hovered ? T.textPrimary : T.textSecondary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: hovered ? `0 0 0 3px ${T.logoGlow}` : 'none',
      transition: 'background 0.13s, border-color 0.13s, box-shadow 0.13s, color 0.13s',
      ...extra,
    };
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen }}>loading…</span>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::placeholder { color: ${T.textDisabled}; font-family: ${FONTS.mono}; }`}</style>

      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '7px',
            background: T.elevated, border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', color: T.textPrimary, margin: '0 auto 12px',
          }}>▣</div>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '22px', color: T.textPrimary, letterSpacing: '-0.02em' }}>
            Sign in to mull
          </h1>
          <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, marginTop: '6px' }}>
            Secure secrets management
          </p>
        </div>

        {/* Invite banner */}
        {inviteInfo && (
          <div style={{
            padding: '10px 14px', marginBottom: '16px',
            background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
            borderLeft: `3px solid ${T.termGreen}`, borderRadius: '4px',
            fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary,
          }}>
            You're joining <strong style={{ color: T.textPrimary }}>{inviteInfo.orgName}</strong> as{' '}
            <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textPrimary }}>{inviteInfo.role.toLowerCase()}</span>
          </div>
        )}

        {/* Card */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '24px' }}>
          {(error || localError) && (
            <div style={{
              padding: '10px 12px', marginBottom: '16px',
              background: T.redBg, border: `1px solid ${T.redBorder}`,
              borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
              fontFamily: FONTS.mono, fontSize: '11px', color: T.red,
            }}>
              {localError || error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSubmit(onDiscover)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormInput
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Btn T={T} variant="primary" size="md" disabled={isSubmitting || submitting} style={{ width: '100%', justifyContent: 'center' }}>
                {submitting ? 'checking…' : 'continue →'}
              </Btn>
            </form>
          )}

          {step !== 'email' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, marginBottom: '6px' }}>email</div>
              <button
                type="button"
                onClick={resetEmail}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: T.overlay,
                  border: `1px solid ${T.border}`,
                  borderRadius: '4px',
                  padding: '9px 10px',
                  color: T.textSecondary,
                  fontFamily: FONTS.mono,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {email}
              </button>
            </div>
          )}

          {step === 'sso' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Btn T={T} variant="primary" size="md" onClick={handleSso} disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
                {submitting ? 'redirecting…' : `continue with ${discovery?.sso?.orgName || 'company'} SSO`}
              </Btn>
              {!discovery?.sso?.required && (
                <Btn T={T} variant="secondary" size="md" onClick={() => setStep('password')} style={{ width: '100%', justifyContent: 'center' }}>
                  use password instead
                </Btn>
              )}
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={onPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {discovery?.sso?.available && (
                <Btn T={T} type="button" variant="secondary" size="md" onClick={handleSso} disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
                  continue with {discovery?.sso?.orgName || 'company'} SSO
                </Btn>
              )}
              <FormInput
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
              <Btn T={T} variant="primary" size="md" disabled={submitting || password.length < 1} style={{ width: '100%', justifyContent: 'center' }}>
                {submitting ? 'signing in…' : 'sign in →'}
              </Btn>
            </form>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
            <span style={{ flex: 1, height: '1px', background: T.border }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>or</span>
            <span style={{ flex: 1, height: '1px', background: T.border }} />
          </div>

          <button
            onClick={() => handleOAuth('google')}
            onMouseEnter={() => setHoveredSocial('google')}
            onMouseLeave={() => setHoveredSocial(null)}
            style={socialButtonStyle('google')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill={hoveredSocial === 'google' ? T.textPrimary : T.textSecondary} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill={hoveredSocial === 'google' ? T.textPrimary : T.textSecondary} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill={hoveredSocial === 'google' ? T.textPrimary : T.textSecondary} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill={hoveredSocial === 'google' ? T.textPrimary : T.textSecondary} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            continue with Google
          </button>
          <button
            onClick={() => handleOAuth('github')}
            onMouseEnter={() => setHoveredSocial('github')}
            onMouseLeave={() => setHoveredSocial(null)}
            style={socialButtonStyle('github', { marginTop: '8px' })}
          >
            <GitHubLogo color={hoveredSocial === 'github' ? T.textPrimary : T.textSecondary} />
            continue with GitHub
          </button>
        </div>

        <p style={{ textAlign: 'center', fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, marginTop: '20px' }}>
          no account?{' '}
          <Link to="/signup" style={{ color: T.textSecondary, textDecoration: 'none' }}>sign up</Link>
        </p>
      </div>
    </div>
  );
}
