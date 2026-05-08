import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONTS } from '@mull/ui';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const NAV_ITEMS = [
  { id: 'nav-projects',     type: 'nav', label: 'projects',     path: '/dashboard/projects' },
  { id: 'nav-parameters',   type: 'nav', label: 'parameters',   path: '/dashboard/parameters' },
  { id: 'nav-environments', type: 'nav', label: 'environments', path: '/dashboard/environments' },
  { id: 'nav-org',          type: 'nav', label: 'org settings', path: '/settings/org' },
  { id: 'nav-profile',      type: 'nav', label: 'profile',      path: '/settings/profile' },
];

const ACTION_ITEMS = [
  { id: 'act-app',  type: 'action', label: 'new app',         path: '/dashboard/projects' },
  { id: 'act-param', type: 'action', label: 'new parameter',  path: '/dashboard/parameters' },
  { id: 'act-env',  type: 'action', label: 'new environment', path: '/dashboard/environments' },
];

function PaletteRow({ item, active, onClick, T }) {
  const ref = useRef(null);
  const typeLabel = { nav: 'go to', action: 'run', app: 'open' }[item.type] ?? item.type;

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        padding: '9px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        cursor: 'pointer',
        background: active ? T.overlay : 'transparent',
        borderLeft: `2px solid ${active ? T.termGreen : 'transparent'}`,
      }}
    >
      <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, width: '40px', flexShrink: 0 }}>
        {typeLabel}
      </span>
      <span style={{ fontFamily: FONTS.mono, fontSize: '13px', color: active ? T.textPrimary : T.textSecondary }}>
        {item.label}
      </span>
    </div>
  );
}

export function CommandPalette({ open, onClose, T }) {
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState(0);
  const [apps, setApps]         = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { orgId } = useAuth();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 10);
    if (orgId) {
      apiService.getProjects()
        .then(data => setApps(data || []))
        .catch(() => setApps([]));
    }
  }, [open, orgId]);

  const appItems = apps.map(a => ({
    id: `app-${a.id}`,
    type: 'app',
    label: a.name,
    path: '/dashboard/projects',
  }));

  const allItems = [...NAV_ITEMS, ...ACTION_ITEMS, ...appItems];

  const filtered = query.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  const handleSelect = useCallback((item) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { if (filtered[selected]) handleSelect(filtered[selected]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;

  const showGroups = !query.trim();
  const groups = [
    { label: '// go to', items: NAV_ITEMS },
    { label: '// run',   items: ACTION_ITEMS },
    ...(appItems.length ? [{ label: '// apps', items: appItems }] : []),
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '60%', maxWidth: '580px',
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '8px', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 16px', borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: FONTS.mono, color: T.termGreen, fontSize: '13px', userSelect: 'none' }}>❯</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="search commands, apps, parameters..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: FONTS.mono, fontSize: '13px', color: T.textPrimary,
            }}
          />
          <kbd style={{
            fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
            border: `1px solid ${T.border}`, borderRadius: '3px', padding: '2px 5px',
          }}>esc</kbd>
        </div>

        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 16px', fontFamily: FONTS.mono, fontSize: '12px', color: T.textMuted }}>
              no results for "{query}"
            </div>
          )}

          {showGroups
            ? groups.map(group => (
                <div key={group.label}>
                  <div style={{
                    padding: '8px 16px 4px',
                    fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.05em',
                  }}>
                    {group.label}
                  </div>
                  {group.items.map(item => {
                    const idx = allItems.indexOf(item);
                    return <PaletteRow key={item.id} item={item} active={idx === selected} onClick={() => handleSelect(item)} T={T} />;
                  })}
                </div>
              ))
            : filtered.map((item, i) => (
                <PaletteRow key={item.id} item={item} active={i === selected} onClick={() => handleSelect(item)} T={T} />
              ))
          }
        </div>

        <div style={{
          padding: '8px 16px', borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: '16px',
          fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
        }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
