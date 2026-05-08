import { useEffect } from 'react';
import { FONTS } from '@mull/ui';

const SHORTCUTS = [
  { key: '⌘K',     desc: 'open command palette' },
  { key: '?',      desc: 'show this modal' },
  { key: '/',      desc: 'focus search' },
  { key: 'N',      desc: 'new item in current context' },
  { key: 'Esc',    desc: 'close modal / deselect' },
  { key: '↑ ↓',   desc: 'navigate list' },
  { key: '↵',      desc: 'open selected' },
  { key: '← →',   desc: 'collapse / expand tree node' },
  { key: 'Space',  desc: 'expand / collapse tree node' },
];

export function ShortcutsModal({ open, onClose, T }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' || e.key === '?') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '380px',
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '8px', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
          fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.1em',
        }}>
          // keyboard shortcuts
        </div>

        <div style={{ padding: '8px 0' }}>
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} style={{
              padding: '7px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
                {desc}
              </span>
              <kbd style={{
                fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary,
                background: T.overlay, border: `1px solid ${T.border}`,
                borderRadius: '3px', padding: '2px 7px', minWidth: '32px', textAlign: 'center',
              }}>
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{
          padding: '10px 16px', borderTop: `1px solid ${T.border}`,
          fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, textAlign: 'center',
        }}>
          press ? or esc to close
        </div>
      </div>
    </div>
  );
}
