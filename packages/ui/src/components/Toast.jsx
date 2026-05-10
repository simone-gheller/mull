import { FONTS } from '../tokens.js';

export function Toast({ variant = 'success', msg, sub, T, duration = 4200, onClose }) {
  const c = {
    success: { accent: T.termGreen, progressBg: T.termGreenBorder },
    warning: { accent: T.amber, progressBg: T.amberBorder },
    error:   { accent: T.red, progressBg: T.redBorder },
  }[variant] ?? {
    accent: T.termGreen,
    progressBg: T.termGreenBorder,
  };

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      width: 'min(360px, calc(100vw - 32px))',
      background: T.elevated,
      border: `1px solid ${T.borderHover}`,
      borderRadius: '6px',
      fontFamily: FONTS.mono,
      boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
    }}>
      <style>{`
        @keyframes mull-toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '14px 1fr 24px',
        alignItems: 'start',
        gap: '12px',
        padding: '14px 14px 18px',
      }}>
        <div style={{
          width: '9px',
          height: '9px',
          marginTop: '6px',
          borderRadius: '50%',
          background: c.accent,
          boxShadow: `0 0 8px ${c.accent}80`,
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: T.textPrimary,
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: 1.3,
            letterSpacing: '0.02em',
            overflowWrap: 'anywhere',
          }}>
            {msg}
          </div>
          {sub && (
            <div style={{
              color: T.textSecondary,
              fontFamily: FONTS.mono,
              fontSize: '11px',
              fontWeight: 400,
              lineHeight: 1.45,
              marginTop: '4px',
              letterSpacing: '0.02em',
              overflowWrap: 'anywhere',
            }}>
              {sub}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onClose}
          style={{
            width: '22px',
            height: '22px',
            border: 'none',
            background: 'transparent',
            color: T.textSecondary,
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontWeight: 400,
            fontSize: '22px',
            lineHeight: '20px',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '5px',
        background: c.progressBg,
      }}>
        <div style={{
          height: '100%',
          background: c.accent,
          animation: `mull-toast-progress ${duration}ms linear forwards`,
        }} />
      </div>
    </div>
  );
}
