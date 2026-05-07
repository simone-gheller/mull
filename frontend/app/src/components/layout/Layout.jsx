import { Outlet } from 'react-router-dom';
import { useTheme, FONTS } from '@mull/ui';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const { T } = useTheme();
  const { orgId } = useAuth();
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
    </div>
  );
}
