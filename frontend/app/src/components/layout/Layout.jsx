import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme, FONTS } from '@vextis/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import apiService from '../../services/api';
import Sidebar from './Sidebar';
import Header from './Header';
import { CommandPalette } from '../CommandPalette';
import { ShortcutsModal } from '../ShortcutsModal';

const PENDING_TOAST_KEY = 'pending_toast';

export default function Layout() {
  const { T } = useTheme();
  const { orgId, user } = useAuth();
  const { toast } = useToast();
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ssoRequired, setSsoRequired] = useState(null);

  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_TOAST_KEY);
    if (pending) {
      sessionStorage.removeItem(PENDING_TOAST_KEY);
      try {
        const { msg, variant, sub } = JSON.parse(pending);
        toast(msg, variant, sub);
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        return;
      }
      if (isTyping) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(o => !o);
      } else if (e.key === '/') {
        e.preventDefault();
        document.querySelector('[data-search]')?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        window.dispatchEvent(new CustomEvent('vextis:new'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = () => setCmdOpen(true);
    window.addEventListener('app:cmd', handler);
    return () => window.removeEventListener('app:cmd', handler);
  }, []);

  useEffect(() => {
    const handler = async () => {
      try {
        const discovery = user?.email ? await apiService.discoverLogin(user.email) : null;
        setSsoRequired(discovery?.sso?.available ? discovery.sso : { available: false });
      } catch {
        setSsoRequired({ available: false });
      }
    };
    window.addEventListener('vextis:sso-required', handler);
    return () => window.removeEventListener('vextis:sso-required', handler);
  }, [user?.email]);

  const continueWithSso = async () => {
    if (!ssoRequired?.providerId) return;
    const { data } = await supabase.auth.signInWithSSO({
      providerId: ssoRequired.providerId,
      options: { redirectTo: `${window.location.origin}/oauth/callback` },
    });
    if (data?.url) window.location.href = data.url;
  };
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::placeholder { color: ${T.textDisabled}; font-family: ${FONTS.mono}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
      `}</style>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        {ssoRequired && (
            <div style={{
              marginBottom: '16px',
              padding: '14px 16px',
              borderRadius: '6px',
              border: `1px solid ${T.amberBorder ?? T.border}`,
              background: T.amberBg ?? T.overlay,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '14px',
            }}>
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>
                  company SSO required
                </div>
                <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted }}>
                  {ssoRequired.available ? `${ssoRequired.orgName} requires SSO for this organization.` : 'This organization requires company SSO.'}
                </div>
              </div>
              <button
                type="button"
                onClick={continueWithSso}
                disabled={!ssoRequired.providerId}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.textSecondary,
                  cursor: ssoRequired.providerId ? 'pointer' : 'not-allowed',
                  fontFamily: FONTS.mono,
                  fontSize: '11px',
                  padding: '8px 10px',
                  whiteSpace: 'nowrap',
                }}
              >
                continue with SSO
              </button>
            </div>
        )}
          <Outlet key={orgId} />
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} T={T} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} T={T} />
    </div>
  );
}
