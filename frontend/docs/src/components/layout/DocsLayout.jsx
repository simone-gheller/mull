import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '@vextis/ui';
import { TopNav } from './TopNav.jsx';
import { Sidebar } from './Sidebar.jsx';
import { MobileMenu } from './MobileMenu.jsx';
import { GlobalStyles } from './GlobalStyles.jsx';
import { TableOfContents } from './TableOfContents.jsx';
import { SearchDialog } from '../search/SearchDialog.jsx';

export function DocsLayout() {
  const { T } = useTheme();
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasToc, setHasToc] = useState(false);
  const onHeadingsChange = useCallback((present) => setHasToc(present), []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = event => {
      const target = event.target;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.textPrimary }}>
      <GlobalStyles T={T} />

      <TopNav T={T} onSearchOpen={() => setSearchOpen(true)} onMenuOpen={() => setMobileOpen(true)} />
      <SearchDialog T={T} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu T={T} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className={hasToc ? 'docs-shell has-toc' : 'docs-shell'}>
        <Sidebar T={T} />
        <main className="docs-page">
          <Outlet context={{ T }} />
        </main>
        <TableOfContents T={T} onHeadingsChange={onHeadingsChange} />
      </div>
    </div>
  );
}
