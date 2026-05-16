import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme, FONTS } from '@vextis/ui';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const { T } = useTheme();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxW = { sm: '380px', md: '480px', lg: '560px', xl: '640px' }[size] ?? '480px';

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: maxW,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: `1px solid ${T.border}`,
          background: T.overlay,
        }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textSecondary }}>{title}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONTS.mono, fontSize: '14px', color: T.textMuted,
            padding: '2px 6px', borderRadius: '3px',
          }}>×</button>
        </div>
        <div style={{ padding: '20px 18px' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
