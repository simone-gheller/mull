import { FONTS } from '../tokens.js';

export function Stat({ label, value, sub, empty, loading, T }) {
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
      {loading ? (
        <div style={{
          height: "28px", width: "64px", borderRadius: "4px",
          background: T.elevated, animation: "pulse 1.4s infinite",
        }} />
      ) : (
        <div style={{
          fontFamily: FONTS.display, fontSize: "26px", fontWeight: 600,
          color: empty ? T.textMuted : T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1,
        }}>
          {value}
        </div>
      )}
      {!loading && sub && (
        <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: empty ? T.textMuted : T.termGreen, marginTop: "6px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
