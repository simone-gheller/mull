import { useEffect, useState } from 'react';
import { useTheme, FONTS, Badge } from '@vextis/ui';
import { TopNav } from '../components/layout/TopNav.jsx';
import { GlobalStyles } from '../components/layout/GlobalStyles.jsx';
import { MobileMenu } from '../components/layout/MobileMenu.jsx';
import { SearchDialog } from '../components/search/SearchDialog.jsx';
import { CHANGELOG } from '../content/changelog.js';

const CATEGORIES = [
  { key: 'features', label: 'New features', variant: 'success' },
  { key: 'improvements', label: 'Improvements', variant: 'info' },
  { key: 'fixes', label: 'Bug fixes', variant: 'warning' },
  { key: 'security', label: 'Security', variant: 'danger' },
];

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// No left sidebar — there's nothing within a changelog to navigate between, it's one continuous
// page of version sections. Reuses TopNav/GlobalStyles/search for the same reason ApiReferencePage
// does: consistent nav chrome even for pages that sit outside DocsLayout's sidebar tree.
export default function ChangelogPage() {
  const { T } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = event => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <GlobalStyles T={T} />
      <TopNav T={T} onSearchOpen={() => setSearchOpen(true)} onMenuOpen={() => setMobileOpen(true)} />
      <SearchDialog T={T} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu T={T} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 32px 100px' }}>
        <header style={{ marginBottom: '36px' }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
            reference
          </div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: '38px', lineHeight: 1.08, letterSpacing: '-0.035em', color: T.textPrimary, marginBottom: '12px' }}>
            Changelog
          </h1>
          <p style={{ fontFamily: FONTS.display, fontSize: '15px', color: T.textSecondary, lineHeight: 1.75, maxWidth: '580px' }}>
            One section per released version — sourced from the project's GitHub Releases, not duplicated by hand.
          </p>
        </header>

        {CHANGELOG.map(entry => (
          <VersionSection key={entry.version} T={T} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function VersionSection({ T, entry }) {
  return (
    <section style={{ borderTop: `1px solid ${T.border}`, padding: '28px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: FONTS.mono, fontSize: '20px', fontWeight: 600, color: T.textPrimary }}>v{entry.version}</h2>
        <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textMuted }}>{formatDate(entry.date)}</span>
      </div>
      <p style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textSecondary, lineHeight: 1.7, marginBottom: '18px', maxWidth: '600px' }}>
        {entry.summary}
      </p>

      {CATEGORIES.filter(cat => entry[cat.key]?.length > 0).map(cat => (
        <div key={cat.key} style={{ marginBottom: '14px' }}>
          <Badge T={T} variant={cat.variant}>{cat.label}</Badge>
          <ul style={{ margin: '10px 0 0', paddingLeft: '18px' }}>
            {entry[cat.key].map((item, i) => (
              <li key={i} style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.65, marginBottom: '4px' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
