import { useState, useEffect, useCallback } from 'react';
import { useTheme, FONTS, Btn, Badge } from '@vextis/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import apiService from '../services/api';
import { useToast } from '../hooks/useToast';

const AUTH_METHODS = [
  { key: 'email',  label: 'Email',   icon: null,     oauth: false },
  { key: 'github', label: 'GitHub',  icon: 'github', oauth: true },
  { key: 'google', label: 'Google',  icon: 'google', oauth: true },
];

function GitHubIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill={color} d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18A10.93 10.93 0 0 1 12 6.02c.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.07.78 2.15v3.16c0 .31.21.67.79.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function GoogleIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill={color} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill={color} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill={color} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill={color} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MailIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 7 10 7 10-7"/>
    </svg>
  );
}

function Section({ title, description, children, T }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: '6px', overflow: 'hidden', marginBottom: '16px',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, background: T.overlay }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '14px', color: T.textPrimary, marginBottom: description ? '2px' : 0 }}>
          {title}
        </div>
        {description && (
          <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted }}>{description}</div>
        )}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled, T }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      style={{
        width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
        background: checked ? T.termGreen : T.elevated,
        border: `1px solid ${checked ? T.termGreenBorder : T.border}`,
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
        opacity: disabled ? 0.45 : 1,
        padding: 0,
      }}
      aria-checked={checked}
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: checked ? '18px' : '2px',
        width: '14px', height: '14px', borderRadius: '50%',
        background: checked ? T.bg : T.textMuted,
        transition: 'left 0.2s',
        display: 'block',
      }} />
    </button>
  );
}

function parseCliName(name) {
  const stripped = name.replace(/^CLI\s*[–-]\s*/, '');
  const idx = stripped.lastIndexOf(' · ');
  if (idx !== -1) return { hostname: stripped.slice(0, idx), os: stripped.slice(idx + 3) };
  return { hostname: stripped, os: '—' };
}

function browserSessionId(accessToken) {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const sid = payload.session_id ?? payload.sub ?? '';
    return sid.replace(/-/g, '').slice(0, 10);
  } catch { return '—'; }
}

function parseBrowserSession() {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua)     ? 'Edge' :
    /Chrome\//.test(ua)  ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua)  ? 'Safari' : 'Browser';
  const os =
    /iPhone/.test(ua)             ? 'iOS' :
    /iPad/.test(ua)               ? 'iPadOS' :
    /Android/.test(ua)            ? 'Android' :
    /Macintosh|Mac OS/.test(ua)   ? 'macOS' :
    /Windows/.test(ua)            ? 'Windows' :
    /Linux/.test(ua)              ? 'Linux' : null;
  return { browser, os };
}

function formatRelative(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SecurityPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();

  const [identities, setIdentities]         = useState([]);
  const [browserSession, setBrowserSession] = useState(null);
  const [cliSessions, setCliSessions]       = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sendingReset, setSendingReset]     = useState(false);
  const [resetSent, setResetSent]           = useState(false);
  const [linkingProvider, setLinkingProvider] = useState(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const [{ data: { session } }, { data: { user: u } }, keys] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
        apiService.getPersonalAccessKeys().catch(() => []),
      ]);
      setBrowserSession(session);
      setIdentities(u?.identities ?? []);
      setCliSessions(keys.filter(k => k.source === 'CLI' && !k.revokedAt));
    } catch {
      toast('failed to load security data', 'error');
    } finally {
      setLoadingSessions(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/account/security`,
      });
      if (error) throw error;
      setResetSent(true);
      setTimeout(() => setResetSent(false), 6000);
    } catch (e) {
      toast('failed to send reset email', 'error', e.message);
    } finally {
      setSendingReset(false);
    }
  };

  const linkProvider = async (provider) => {
    setLinkingProvider(provider);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/account/security` },
      });
      if (error) throw error;
    } catch (e) {
      toast(`failed to link ${provider}`, 'error', e.message);
      setLinkingProvider(null);
    }
  };

  const unlinkProvider = async (providerKey) => {
    const identity = identities.find(i => i.provider === providerKey);
    if (!identity) return;
    if (identities.length <= 1) {
      toast('cannot remove the only sign-in method', 'error');
      return;
    }
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      toast(`${providerKey} unlinked`);
      await loadAll();
    } catch (e) {
      toast(`failed to unlink ${providerKey}`, 'error', e.message);
    }
  };

  const revokeCliSession = async (key) => {
    try {
      await apiService.revokePersonalAccessKey(key.id);
      toast('session revoked');
      setCliSessions(prev => prev.filter(s => s.id !== key.id));
    } catch {
      toast('failed to revoke session', 'error');
    } finally {
      setConfirmRevokeId(null);
    }
  };

  const linkedProviders = new Set(identities.map(i => i.provider));

  return (
    <div>
      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
        // account · security
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '26px', color: T.textPrimary, letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Security
      </h1>

      {/* ── Password + Auth Methods card ────────────── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '6px', overflow: 'hidden', marginBottom: '16px',
      }}>
        {/* Password */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '13px', color: T.textPrimary, marginBottom: '10px' }}>
            Password
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {resetSent ? (
              <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.termGreen }}>✓ check your inbox</span>
            ) : (
              <Btn
                T={T} variant="secondary" size="sm"
                onClick={sendPasswordReset}
                disabled={sendingReset || resetSent}
              >
                {sendingReset ? 'sending…' : '+ reset password'}
              </Btn>
            )}
          </div>
        </div>

        {/* Authentication Methods */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '13px', color: T.textPrimary, marginBottom: '4px' }}>
            Authentication Methods
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted, marginBottom: '12px' }}>
            Sign-in methods linked to your account
          </div>
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', minWidth: '280px' }}>
          {AUTH_METHODS.map(method => {
            const isLinked  = linkedProviders.has(method.key);
            const isLinking = linkingProvider === method.key;
            const canUnlink = isLinked && identities.length > 1;
            const isEmail   = method.key === 'email';

            const handleToggle = () => {
              if (isEmail) {
                if (!isLinked) sendPasswordReset();
              } else {
                if (isLinked) unlinkProvider(method.key);
                else linkProvider(method.key);
              }
            };

            const iconColor = isLinked ? T.textPrimary : T.textMuted;

            return (
              <div
                key={method.key}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px',
                  background: T.overlay,
                  border: `1px solid ${isLinked ? T.borderHover : T.border}`,
                  borderRadius: '6px',
                }}
              >
                <span style={{ width: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {method.icon === 'github' && <GitHubIcon color={iconColor} />}
                  {method.icon === 'google' && <GoogleIcon color={iconColor} />}
                  {method.icon === null     && <MailIcon color={iconColor} />}
                </span>
                <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, flex: 1, userSelect: 'none' }}>
                  {method.label}
                  {isLinking && (
                    <span style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted, marginLeft: '6px' }}>
                      redirecting…
                    </span>
                  )}
                </span>
                <Toggle
                  T={T}
                  checked={isLinked}
                  disabled={isLinking || (isLinked && (isEmail || !canUnlink))}
                  onChange={handleToggle}
                />
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* ── Active Sessions ──────────────────────────── */}
      <Section T={T} title="Active Sessions" description="Browser and CLI sessions currently signed in">
        {loadingSessions ? (
          <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>loading...</div>
        ) : (() => {
          const { browser, os } = parseBrowserSession();
          const hasAny = browserSession || cliSessions.length > 0;

          if (!hasAny) {
            return <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>// no active sessions</div>;
          }

          const COL = '330px 70px 80px 90px 72px';
          const HEADS = ['id', 'agent', 'os', 'accessed', ''];

          return (
            <div>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: COL,
                padding: '0 12px 8px',
                borderBottom: `1px solid ${T.border}`,
                marginBottom: '4px',
              }}>
                {HEADS.map(h => (
                  <span key={h} style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              {/* Browser row */}
              {browserSession && (
                <div style={{
                  display: 'grid', gridTemplateColumns: COL, alignItems: 'center',
                  padding: '10px 12px', borderRadius: '4px',
                }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {browserSessionId(browserSession.access_token)}
                  </span>
                  <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary }}>{browser}</span>
                  <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary }}>{os ?? '—'}</span>
                  <span style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>
                    {formatRelative(browserSession.user?.last_sign_in_at)}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{
                      fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen,
                      letterSpacing: '0.06em', padding: '3px 7px',
                      border: `1px solid ${T.termGreenBorder}`,
                      borderRadius: '4px', background: T.termGreenBg,
                    }}>CURRENT</span>
                  </span>
                </div>
              )}

              {/* CLI rows */}
              {cliSessions.map(s => {
                const { os: cliOs } = parseCliName(s.name);
                const confirming = confirmRevokeId === s.id;
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'grid', gridTemplateColumns: COL, alignItems: 'center',
                      padding: '10px 12px', borderRadius: '4px',
                    }}
                  >
                    <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.tokenPrefix}
                    </span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary }}>cli</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary }}>{cliOs}</span>
                    <span style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>
                      {formatRelative(s.lastUsedAt)}
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      {confirming ? (
                        <>
                          <Btn T={T} variant="danger" size="sm" onClick={() => revokeCliSession(s)}>yes</Btn>
                          <Btn T={T} variant="secondary" size="sm" onClick={() => setConfirmRevokeId(null)}>no</Btn>
                        </>
                      ) : (
                        <Btn T={T} variant="secondary" size="sm" onClick={() => setConfirmRevokeId(s.id)}>revoke</Btn>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Section>
    </div>
  );
}
