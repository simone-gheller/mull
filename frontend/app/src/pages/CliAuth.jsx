import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme, Btn, FONTS } from '@mull/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import FormInput from '../components/ui/FormInput';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CliAuth() {
  const { T } = useTheme();
  const { isAuthenticated, loading: authLoading, user, orgs } = useAuth();
  const [searchParams] = useSearchParams();
  const codeId = searchParams.get('code');

  const [deviceInfo, setDeviceInfo] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Confirm state
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState(null);
  const [done, setDone] = useState(false);

  const fetchDeviceInfo = useCallback(async () => {
    if (!codeId) return;
    try {
      const res = await fetch(`${API_URL}/cli/device-code/${codeId}`);
      if (res.status === 404) {
        const body = await res.json().catch(() => ({}));
        setFetchError(body.message || 'Device code not found or expired.');
        return;
      }
      if (!res.ok) {
        setFetchError('Something went wrong. Please try again.');
        return;
      }
      const data = await res.json();
      setDeviceInfo(data);
    } catch {
      setFetchError('Could not reach the server.');
    }
  }, [codeId]);

  useEffect(() => {
    fetchDeviceInfo();
  }, [fetchDeviceInfo]);

  // Pre-select org once authenticated
  useEffect(() => {
    if (orgs?.length > 0 && !selectedOrgId) {
      const owner = orgs.find(o => o.role === 'OWNER') ?? orgs[0];
      setSelectedOrgId(owner.id);
    }
  }, [orgs, selectedOrgId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
    setLoginLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedOrgId || !codeId) return;
    setApproving(true);
    setApproveError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${API_URL}/cli/device-code/${codeId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: selectedOrgId })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApproveError(body.message || 'Authorization failed. Please try again.');
        setApproving(false);
        return;
      }
      setDone(true);
    } catch {
      setApproveError('Could not reach the server.');
      setApproving(false);
    }
  };

  const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '24px' };
  const monoSm = { fontFamily: FONTS.mono, fontSize: '11px' };
  const label = { fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, marginBottom: '6px' };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...monoSm, fontSize: '12px', color: T.termGreen }}>loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
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
            {done ? 'Authorized' : 'Authorize mull CLI'}
          </h1>
          <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, marginTop: '6px' }}>
            {done ? 'You can close this window.' : 'Grant CLI access to your mull account'}
          </p>
        </div>

        {/* Missing code param */}
        {!codeId && (
          <div style={card}>
            <p style={{ ...monoSm, color: T.textSecondary }}>
              No authorization code found. Run <span style={{ color: T.termGreen }}>mull auth login</span> to start.
            </p>
          </div>
        )}

        {/* Fetch error (expired / not found) */}
        {codeId && fetchError && (
          <div style={card}>
            <div style={{
              padding: '10px 12px',
              background: T.redBg, border: `1px solid ${T.redBorder}`,
              borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
              ...monoSm, color: T.red,
            }}>{fetchError}</div>
            <p style={{ ...monoSm, color: T.textSecondary, marginTop: '14px' }}>
              Run <span style={{ color: T.termGreen }}>mull auth login</span> again to get a fresh link.
            </p>
          </div>
        )}

        {/* Success */}
        {done && (
          <div style={card}>
            <div style={{
              padding: '10px 12px',
              background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
              borderLeft: `3px solid ${T.termGreen}`, borderRadius: '4px',
              ...monoSm, color: T.termGreen,
            }}>
              CLI session created. Return to your terminal.
            </div>
          </div>
        )}

        {/* Main flow */}
        {codeId && !fetchError && !done && deviceInfo && (
          <div style={card}>
            {/* Device banner */}
            <div style={{
              padding: '10px 12px', marginBottom: '20px',
              background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
              borderLeft: `3px solid ${T.termGreen}`, borderRadius: '4px',
            }}>
              <div style={{ ...monoSm, color: T.textMuted, marginBottom: '3px' }}>authorizing device</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.termGreen }}>{deviceInfo.deviceName}</div>
            </div>

            {/* Not authenticated: show login form */}
            {!isAuthenticated && (
              <>
                <p style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary, marginBottom: '16px' }}>
                  Sign in to authorize this device.
                </p>
                {loginError && (
                  <div style={{
                    padding: '10px 12px', marginBottom: '14px',
                    background: T.redBg, border: `1px solid ${T.redBorder}`,
                    borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
                    ...monoSm, color: T.red,
                  }}>{loginError}</div>
                )}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <FormInput
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <FormInput
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <Btn T={T} variant="primary" size="md" disabled={loginLoading} style={{ width: '100%', justifyContent: 'center' }}>
                    {loginLoading ? 'signing in…' : 'sign in →'}
                  </Btn>
                </form>
              </>
            )}

            {/* Authenticated: show confirm */}
            {isAuthenticated && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={label}>signed in as</div>
                  <div style={{ ...monoSm, color: T.textPrimary }}>{user?.email}</div>
                </div>

                {orgs && orgs.length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={label}>authorize for</div>
                    <select
                      value={selectedOrgId}
                      onChange={e => setSelectedOrgId(e.target.value)}
                      style={{
                        width: '100%',
                        background: T.overlay, border: `1px solid ${T.border}`,
                        borderRadius: '4px', padding: '9px 10px',
                        color: T.textPrimary, fontFamily: FONTS.mono, fontSize: '12px',
                        cursor: 'pointer', outline: 'none',
                      }}
                    >
                      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                )}

                {orgs && orgs.length === 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={label}>authorize for</div>
                    <div style={{ ...monoSm, color: T.textPrimary }}>{orgs[0].name}</div>
                  </div>
                )}

                {approveError && (
                  <div style={{
                    padding: '10px 12px', marginBottom: '14px',
                    background: T.redBg, border: `1px solid ${T.redBorder}`,
                    borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
                    ...monoSm, color: T.red,
                  }}>{approveError}</div>
                )}

                <Btn
                  T={T} variant="primary" size="md"
                  disabled={approving || !selectedOrgId}
                  onClick={handleApprove}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {approving ? 'authorizing…' : 'authorize →'}
                </Btn>

                <p style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted, marginTop: '12px', textAlign: 'center' }}>
                  This creates a 90-day CLI session. You can revoke it anytime from settings.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
