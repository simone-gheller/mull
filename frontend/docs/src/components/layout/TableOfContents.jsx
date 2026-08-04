import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FONTS } from '@vextis/ui';

// Reads whatever <h2 id> sections the current page actually rendered, rather than a hardcoded
// per-route list — pages with 4+ sections (CLI reference, Roles & permissions) get a TOC for
// free, pages without section headings (most of the guide pages) render nothing.
export function TableOfContents({ T, onHeadingsChange }) {
  const { pathname } = useLocation();
  const [headings, setHeadings] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nodes = Array.from(document.querySelectorAll('main.docs-page h2[id]'));
      const next = nodes.map(node => ({ id: node.id, text: node.textContent }));
      setHeadings(next);
      onHeadingsChange?.(next.length >= 4);
    }, 30);
    return () => window.clearTimeout(timer);
  }, [pathname, onHeadingsChange]);

  if (headings.length < 4) return null;

  return (
    <nav className="docs-toc" aria-label="On this page">
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: '10px',
        color: T.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: '10px',
      }}>
        On this page
      </div>
      <div style={{ display: 'grid', gap: '2px' }}>
        {headings.map(heading => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            style={{
              fontFamily: FONTS.display,
              fontSize: '12px',
              color: T.textSecondary,
              textDecoration: 'none',
              padding: '4px 0',
            }}
          >
            {heading.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
