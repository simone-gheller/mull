import { useState } from 'react';
import { FONTS } from '../tokens.js';

export function Input({ label, placeholder, type = "text", prefix, suffix, hint, readOnly, T, ...rest }) {
  const [f, setF] = useState(false);
  return (
    <div>
      {label && (
        <div style={{
          fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted,
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px",
        }}>
          {label}
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "stretch",
        background: readOnly ? T.overlay : T.surface, borderRadius: "4px",
        border: `1px solid ${f && !readOnly ? T.termGreen : T.border}`,
        boxShadow: f && !readOnly ? `0 0 0 3px ${T.termGreenBg}` : "none",
        transition: "all 0.13s", overflow: "hidden",
      }}>
        {prefix && (
          <span style={{
            padding: "0 10px", fontFamily: FONTS.mono, fontSize: "12px",
            color: T.textMuted, background: T.overlay,
            borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center",
          }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          readOnly={readOnly}
          onFocus={() => setF(true)}
          onBlur={() => setF(false)}
          {...rest}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            padding: "8px 12px", fontFamily: FONTS.mono, fontSize: "12px",
            color: readOnly ? T.textMuted : T.textPrimary,
            cursor: readOnly ? "default" : "text",
          }}
        />
        {suffix && (
          <span style={{
            padding: "0 10px", fontFamily: FONTS.mono, fontSize: "11px",
            color: T.termGreen, display: "flex", alignItems: "center",
          }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginTop: "4px" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
