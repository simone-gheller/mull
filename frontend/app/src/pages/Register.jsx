import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme, Btn, FONTS } from '@mull/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import FormInput from '../components/ui/FormInput';

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

export default function Register() {
  const { T } = useTheme();
  const { register: registerUser, isAuthenticated, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => { if (isAuthenticated) navigate('/dashboard', { replace: true }); }, [isAuthenticated, navigate]);
  useEffect(() => () => clearError(), [clearError]);

  const onSubmit = async ({ confirmPassword, organizationName, ...rest }) => {
    const result = await registerUser(rest);
    if (result.success) navigate('/dashboard', { replace: true });
  };

  const handleGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/oauth/callback` },
    });
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

      <div style={{ width: '100%', maxWidth: '400px' }}>
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

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormInput label="Display name" placeholder="Ada Lovelace" error={errors.displayName?.message} {...register('displayName')} />
            <FormInput label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <FormInput label="Organization name" placeholder="acme-corp" error={errors.organizationName?.message} {...register('organizationName')} />
            <FormInput label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <FormInput label="Confirm password" type="password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Btn T={T} variant="primary" size="md" disabled={isSubmitting}>
              {isSubmitting ? 'creating account…' : 'create account →'}
            </Btn>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
            <span style={{ flex: 1, height: '1px', background: T.border }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>or</span>
            <span style={{ flex: 1, height: '1px', background: T.border }} />
          </div>

          <button onClick={handleGoogle} style={{
            width: '100%', padding: '8px', borderRadius: '4px',
            background: 'transparent', border: `1px solid ${T.border}`, cursor: 'pointer',
            fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill={T.textSecondary} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill={T.textSecondary} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill={T.textSecondary} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill={T.textSecondary} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            continue with Google
          </button>
        </div>

        <p style={{ textAlign: 'center', fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, marginTop: '20px' }}>
          have an account?{' '}
          <Link to="/login" style={{ color: T.textSecondary, textDecoration: 'none' }}>sign in</Link>
        </p>
      </div>
    </div>
  );
}
