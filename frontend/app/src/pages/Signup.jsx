import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme, Btn, FONTS } from '@mull/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import apiService from '../services/api';
import FormInput from '../components/ui/FormInput';

const SESSION_STEP = 'signup_step';
const SESSION_EMAIL = 'signup_email';
const SESSION_INVITE = 'invite_token';

const schema = z.object({
  displayName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email'),
  organizationName: z.string().min(2, 'At least 2 characters'),
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
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

function FormStep({ T, onSubmit, isSubmitting, error, onOAuth, onInviteSso, inviteInfo, inviteEmail }) {
  const [hoveredSocial, setHoveredSocial] = useState(null);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: inviteEmail || '',
      organizationName: 'my org',
    },
  });

  useEffect(() => {
    if (inviteEmail) setValue('email', inviteEmail);
  }, [inviteEmail, setValue]);

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

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '7px',
          background: T.elevated, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', color: T.textPrimary, margin: '0 auto 12px',
        }}>▣</div>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '22px', color: T.textPrimary, letterSpacing: '-0.02em' }}>
          Create your account
        </h1>
        <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, marginTop: '6px' }}>
          Start managing secrets in minutes
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

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '24px' }}>
        {error && (
          <div style={{
            padding: '10px 12px', marginBottom: '16px',
            background: T.redBg, border: `1px solid ${T.redBorder}`,
            borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
            fontFamily: FONTS.mono, fontSize: '11px', color: T.red,
          }}>
            {error}
          </div>
        )}

        {inviteInfo?.sso?.required ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted }}>
              This organization requires company SSO.
            </div>
            <Btn T={T} variant="primary" size="md" onClick={onInviteSso} disabled={isSubmitting}>
              continue with {inviteInfo.orgName} SSO
            </Btn>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormInput label="Display name" placeholder="Ada Lovelace" error={errors.displayName?.message} {...register('displayName')} />
            <FormInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              readOnly={!!inviteEmail}
              {...register('email')}
            />
            <FormInput label="Organization name" placeholder="acme-corp" error={errors.organizationName?.message} {...register('organizationName')} />
            <FormInput label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <FormInput label="Confirm password" type="password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Btn T={T} variant="primary" size="md" disabled={isSubmitting}>
              {isSubmitting ? 'creating account…' : 'create account →'}
            </Btn>
          </form>
        )}

        {!inviteEmail && !inviteInfo?.sso?.required && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
              <span style={{ flex: 1, height: '1px', background: T.border }} />
              <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>or</span>
              <span style={{ flex: 1, height: '1px', background: T.border }} />
            </div>

            <button
              onClick={() => onOAuth('google')}
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
              onClick={() => onOAuth('github')}
              onMouseEnter={() => setHoveredSocial('github')}
              onMouseLeave={() => setHoveredSocial(null)}
              style={socialButtonStyle('github', { marginTop: '8px' })}
            >
              <GitHubLogo color={hoveredSocial === 'github' ? T.textPrimary : T.textSecondary} />
              continue with GitHub
            </button>
          </>
        )}
      </div>

      <p style={{ textAlign: 'center', fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, marginTop: '20px' }}>
        have an account?{' '}
        <Link to="/login" style={{ color: T.textSecondary, textDecoration: 'none' }}>sign in</Link>
      </p>
    </>
  );
}

function OtpStep({ T, email, onVerify, onBack, isVerifying, error }) {
  const [code, setCode] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    if (code.length < 6) return;
    onVerify(code);
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '7px',
          background: T.elevated, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', color: T.termGreen, margin: '0 auto 12px',
        }}>✉</div>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '22px', color: T.textPrimary, letterSpacing: '-0.02em' }}>
          Check your email
        </h1>
        <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, marginTop: '6px' }}>
          We sent a 6-digit code to{' '}
          <span style={{ color: T.textPrimary, fontFamily: FONTS.mono }}>{email}</span>
        </p>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '24px' }}>
        {error && (
          <div style={{
            padding: '10px 12px', marginBottom: '16px',
            background: T.redBg, border: `1px solid ${T.redBorder}`,
            borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
            fontFamily: FONTS.mono, fontSize: '11px', color: T.red,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
              verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              style={{
                width: '100%', padding: '8px 10px',
                background: T.overlay, border: `1px solid ${T.border}`,
                borderRadius: '4px', outline: 'none',
                fontFamily: FONTS.mono, fontSize: '20px', color: T.textPrimary,
                letterSpacing: '0.3em', textAlign: 'center',
              }}
            />
          </div>
          <Btn T={T} variant="primary" size="md" disabled={isVerifying || code.length < 6}>
            {isVerifying ? 'verifying…' : 'verify →'}
          </Btn>
        </form>
      </div>

      <p style={{ textAlign: 'center', fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, marginTop: '20px' }}>
        wrong email?{' '}
        <span onClick={onBack} style={{ color: T.textSecondary, cursor: 'pointer' }}>go back</span>
      </p>
    </>
  );
}

export default function Signup() {
  const { T } = useTheme();
  const { register: registerUser, verifyOtp, isAuthenticated, error, clearError, switchOrg } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get('invite');
  const inviteEmail = searchParams.get('email') || '';

  const [step, setStep] = useState(() => sessionStorage.getItem(SESSION_STEP) || 'form');
  const [email, setEmail] = useState(() => sessionStorage.getItem(SESSION_EMAIL) || inviteEmail);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState(null);

  useEffect(() => {
    if (!inviteToken) return;
    apiService.getInviteByToken(inviteToken)
      .then(data => setInviteInfo(data))
      .catch(() => {});
  }, [inviteToken]);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => () => clearError(), [clearError]);

  const onRegister = async (formData) => {
    setIsSubmitting(true);
    if (inviteToken) sessionStorage.setItem(SESSION_INVITE, inviteToken);
    const result = await registerUser(formData);
    setIsSubmitting(false);
    if (!result.success) return;
    if (result.sessionCreated) {
      sessionStorage.removeItem(SESSION_STEP);
      sessionStorage.removeItem(SESSION_EMAIL);
      navigate('/dashboard', { replace: true });
    } else {
      sessionStorage.setItem(SESSION_STEP, 'verify');
      sessionStorage.setItem(SESSION_EMAIL, formData.email);
      setEmail(formData.email);
      setStep('verify');
    }
  };

  const onVerify = async (token) => {
    setIsVerifying(true);
    setOtpError(null);
    const result = await verifyOtp({ email, token });
    if (!result.success) {
      setOtpError(result.error);
      setIsVerifying(false);
      return;
    }
    sessionStorage.removeItem(SESSION_STEP);
    sessionStorage.removeItem(SESSION_EMAIL);

    const savedInvite = sessionStorage.getItem(SESSION_INVITE);
    if (savedInvite) {
      sessionStorage.removeItem(SESSION_INVITE);
      try {
        const accepted = await apiService.acceptInvite(savedInvite);
        sessionStorage.setItem('pending_toast', JSON.stringify({
          msg: `You've joined ${accepted.orgName}`,
          sub: accepted.role.toLowerCase(),
          variant: 'success',
        }));
        switchOrg(accepted.orgId);
      } catch {
        // ignore — user lands on their own org
      }
    }
    // onAuthStateChange in AuthContext navigates to /dashboard
  };

  const onBack = () => {
    sessionStorage.removeItem(SESSION_STEP);
    sessionStorage.removeItem(SESSION_EMAIL);
    sessionStorage.removeItem(SESSION_INVITE);
    clearError();
    setOtpError(null);
    setStep('form');
  };

  const onOAuth = (provider) => {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/oauth/callback` },
    });
  };

  const onInviteSso = async () => {
    const providerId = inviteInfo?.sso?.providerId;
    if (!providerId) return;
    const { data } = await supabase.auth.signInWithSSO({
      providerId,
      options: { redirectTo: `${window.location.origin}/oauth/callback` },
    });
    if (data?.url) window.location.href = data.url;
  };

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::placeholder { color: ${T.textDisabled}; font-family: ${FONTS.mono}; }`}</style>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {step === 'verify'
          ? <OtpStep T={T} email={email} onVerify={onVerify} onBack={onBack} isVerifying={isVerifying} error={otpError} />
          : <FormStep T={T} onSubmit={onRegister} isSubmitting={isSubmitting} error={error} onOAuth={onOAuth} onInviteSso={onInviteSso} inviteInfo={inviteInfo} inviteEmail={inviteEmail} />
        }
      </div>
    </div>
  );
}
