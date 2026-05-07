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
        borderRadius: "5px", cursor: "pointer",
        background: active ? T.elevated : h ? T.overlay : "transparent",
        border: `1px solid ${active ? T.border : "transparent"}`,
        fontFamily: FONTS.mono, fontSize: "12px",
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
