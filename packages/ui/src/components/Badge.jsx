import { FONTS } from '../tokens.js';

export function Badge({ children, variant = "default", pulse: p, T }) {
  const v = {
    default:        { bg: T.elevated,    color: T.textSecondary, border: T.border },
    success:        { bg: T.termGreenBg, color: T.termGreen,     border: T.termGreenBorder },
    warning:        { bg: T.amberBg,     color: T.amber,         border: T.amberBorder },
    danger:         { bg: T.redBg,       color: T.red,           border: T.redBorder },
    info:           { bg: T.blueBg,      color: T.blue,          border: T.blueBorder },
    outline:        { bg: 'transparent', color: T.termGreen,     border: T.termGreenBorder },
  }[variant] ?? { bg: T.elevated, color: T.textSecondary, border: T.border };
  return (
    <span style={{
      fontFamily: FONTS.mono, fontSize: "10px", letterSpacing: "0.07em",
      padding: "2px 7px", borderRadius: "3px",
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      display: "inline-flex", alignItems: "center", gap: "5px",
      textTransform: "uppercase",
    }}>
      {p && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: v.color, animation: "pulse 1.4s infinite" }} />}
      {children}
    </span>
  );
}
