import { useState } from 'react';
import { FONTS } from '../tokens.js';

export function NavItem({ icon, label, active, badge, T }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px",
        cursor: "pointer",
        background: active ? T.elevated : h ? T.overlay : "transparent",
        borderLeft: `2px solid ${active ? T.termGreen : "transparent"}`,
        borderRadius: "0 6px 6px 0",
        fontFamily: FONTS.mono, fontSize: "13px",
        color: active ? T.textPrimary : h ? T.textPrimary : T.textSecondary,
        transition: "all 0.1s", userSelect: "none",
      }}
    >
      <span style={{ fontSize: "13px", opacity: active ? 1 : 0.75 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          background: T.termGreenBg, color: T.termGreen,
          border: `1px solid ${T.termGreenBorder}`,
          fontSize: "9px", padding: "1px 6px", borderRadius: "3px", fontFamily: FONTS.mono,
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}
