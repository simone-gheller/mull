import { FONTS } from '../tokens.js';

export function Toast({ variant, msg, sub, T }) {
  const c = {
    success: { accent: T.termGreen, bg: T.termGreenBg, border: T.termGreenBorder },
    warning: { accent: T.amber, bg: T.amberBg, border: T.amberBorder },
    error:   { accent: T.red, bg: T.redBg, border: T.redBorder },
  }[variant];
  return (
    <div style={{
      padding: "11px 14px", background: c.bg, border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${c.accent}`, borderRadius: "5px",
      fontFamily: FONTS.mono, boxShadow: `0 4px 16px rgba(0,0,0,0.12)`,
    }}>
      <div style={{ fontSize: "12px", color: T.textPrimary, marginBottom: sub ? "3px" : 0 }}>{msg}</div>
      {sub && <div style={{ fontSize: "10px", color: T.textMuted }}>{sub}</div>}
    </div>
  );
}
