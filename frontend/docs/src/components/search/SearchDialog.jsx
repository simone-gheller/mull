import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { ALL_PAGES } from '../../content/navigation.js';

export function SearchDialog({ T, open, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_PAGES;
    return ALL_PAGES.filter(page => (
      page.title.toLowerCase().includes(q) ||
      page.description.toLowerCase().includes(q) ||
      page.group.toLowerCase().includes(q)
    ));
  }, [query]);

  if (!open) return null;

  const select = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="docs-modal-layer">
      <button type="button" className="docs-modal-backdrop" aria-label="Close search" onClick={onClose} />
      <div className="docs-search-dialog" role="dialog" aria-modal="true" aria-label="Search docs" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: FONTS.mono, color: T.termGreen }}>/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search docs..."
            style={{
              flex: 1,
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: T.textPrimary,
              fontFamily: FONTS.mono,
              fontSize: '13px',
            }}
          />
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '4px', color: T.textMuted, fontFamily: FONTS.mono, fontSize: '10px', padding: '4px 7px' }}>
            esc
          </button>
        </div>
        <div style={{ maxHeight: '420px', overflow: 'auto', padding: '8px' }}>
          {results.map(page => (
            <a
              key={page.path}
              href={page.path}
              onClick={(event) => { event.preventDefault(); select(page.path); }}
              className="search-result"
              style={{ display: 'block', padding: '11px 12px', borderRadius: '6px', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                <span style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textPrimary, fontWeight: 600 }}>{page.title}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen }}>{page.group}</span>
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted, lineHeight: 1.55 }}>{page.description}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
