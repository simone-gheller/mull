import { useState } from 'react';
import { useTheme, FONTS } from '@vextis/ui';
import { HomePage } from './pages/HomePage.jsx';
import { PricingPage } from './pages/PricingPage.jsx';

const PAGES = { home: HomePage, pricing: PricingPage };

export default function App() {
  const [page, setPage] = useState('home');
  const { T, toggle, mode } = useTheme();
  const Page = PAGES[page];

  return (
    <div>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        a { color: inherit; }
      `}</style>

      {/* Global nav overlay for page switching (dev/demo only) */}
      <div style={{
        position: "fixed", bottom: "20px", right: "20px", zIndex: 9999,
        display: "flex", gap: "6px", background: T.surface,
        border: `1px solid ${T.border}`, borderRadius: "6px", padding: "6px",
      }}>
        {Object.keys(PAGES).map(p => (
          <button key={p} onClick={() => setPage(p)} style={{
            fontFamily: FONTS.mono, fontSize: "10px", padding: "4px 10px",
            borderRadius: "3px", border: "none", cursor: "pointer",
            background: page === p ? T.elevated : "transparent",
            color: page === p ? T.textPrimary : T.textMuted,
          }}>
            {p}
          </button>
        ))}
        <button onClick={toggle} style={{
          fontFamily: FONTS.mono, fontSize: "10px", padding: "4px 10px",
          borderRadius: "3px", border: `1px solid ${T.border}`, cursor: "pointer",
          background: "transparent", color: T.textMuted,
        }}>
          {mode === 'dark' ? '☀' : '●'}
        </button>
      </div>

      <Page onNavigate={setPage} />
    </div>
  );
}
