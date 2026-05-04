import { FONTS } from '../tokens.js';

export function Card({ children, title, accent, T, style: sx }) {
  const accentMap = { green: T.termGreen, amber: T.amber, red: T.red, blue: T.blue };
  const ac = accentMap[accent];
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: "6px", overflow: "hidden", ...sx,
    }}>
      {title && (
        <div style={{
          padding: "9px 16px", borderBottom: `1px solid ${T.border}`,
          background: T.overlay, display: "flex", alignItems: "center", gap: "10px",
        }}>
          {ac && <span style={{ width: "3px", height: "13px", background: ac, borderRadius: "2px", boxShadow: `0 0 5px ${ac}` }} />}
          <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textSecondary }}>{title}</span>
        </div>
      )}
      <div style={{ padding: "18px" }}>{children}</div>
    </div>
  );
}
