import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme, FONTS } from '@mull/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { CommandPalette } from '../CommandPalette';
import { ShortcutsModal } from '../ShortcutsModal';

const PENDING_TOAST_KEY = 'pending_toast';

export default function Layout() {
  const { T } = useTheme();
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
        window.dispatchEvent(new CustomEvent('mull:new'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
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
          <Outlet key={orgId} />
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} T={T} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} T={T} />
    </div>
  );
}
