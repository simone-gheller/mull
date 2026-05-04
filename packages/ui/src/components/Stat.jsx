import { FONTS } from '../tokens.js';

export function Stat({ label, value, sub, T }) {
  return (
    <div style={{
      padding: "16px 18px", background: T.surface,
      border: `1px solid ${T.border}`, borderRadius: "6px",
    }}>
      <div style={{
        fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: FONTS.display, fontSize: "26px", fontWeight: 600,
        color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, marginTop: "6px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
