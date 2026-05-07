import { useState } from 'react';
import { FONTS } from '../tokens.js';

export function Btn({ children, variant = "primary", size = "md", icon, disabled, style: externalStyle, T, ...rest }) {
  const [h, setH] = useState(false);
  const [a, setA] = useState(false);
  const pad = { sm: "4px 12px", md: "8px 18px", lg: "11px 26px" }[size];
  const fs  = { sm: "11px", md: "12px", lg: "13px" }[size];

  const styles = {
    primary: {
      background: h ? T.textPrimary : T.surface,
      color: h ? T.bg : T.textPrimary,
      border: `1px solid ${h ? T.textPrimary : T.border}`,
      boxShadow: h ? `0 0 0 3px ${T.logoGlow}` : "none",
    },
    secondary: {
      background: "transparent",
      color: h ? T.textSecondary : T.textMuted,
      border: `1px solid ${h ? T.borderHover : T.border}`,
    },
    terminal: {
      background: h ? T.termGreenBg : "transparent",
      color: T.termGreen,
      border: `1px solid ${T.termGreenBorder}`,
      boxShadow: h ? `0 0 10px rgba(34,197,94,0.12)` : "none",
    },
    danger: {
      background: h ? T.redBg : "transparent",
      color: T.red,
      border: `1px solid ${T.redBorder}`,
    },
    warning: {
      background: h ? T.amberBg : "transparent",
      color: T.amber,
      border: `1px solid ${T.amberBorder}`,
    },
  };

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => { setH(false); setA(false); }}
      onMouseDown={() => setA(true)}
      onMouseUp={() => setA(false)}
      {...rest}
      style={{
        padding: pad, fontSize: fs, ...styles[variant],
        fontFamily: FONTS.mono, borderRadius: "4px", cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: "7px",
        transition: "all 0.13s", opacity: disabled ? 0.35 : 1,
        letterSpacing: "0.02em", outline: "none",
        transform: a ? "translateY(1px)" : "none",
        ...externalStyle,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
