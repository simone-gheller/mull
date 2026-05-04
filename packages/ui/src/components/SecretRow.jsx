import { useState } from 'react';
import { FONTS } from '../tokens.js';
import { Badge } from './Badge.jsx';

export function SecretRow({ k, v, env, ago, T }) {
  const [shown, setShown] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "grid", gridTemplateColumns: "190px 1fr 80px 100px 60px",
        gap: "12px", alignItems: "center", padding: "9px 16px",
        borderBottom: `1px solid ${T.border}`,
        background: hov ? T.overlay : "transparent",
        transition: "background 0.1s", fontFamily: FONTS.mono, fontSize: "12px",
      }}
    >
      <span style={{ color: T.textPrimary }}>{k}</span>
      <span style={{
        color: shown ? T.amber : T.textMuted,
        letterSpacing: shown ? "normal" : "0.12em",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {shown ? v : "•".repeat(Math.min(v.length, 24))}
      </span>
      <Badge variant="info" T={T}>{env}</Badge>
      <span style={{ color: T.textMuted, fontSize: "10px" }}>{ago}</span>
      <button
        onClick={() => setShown(s => !s)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: FONTS.mono, fontSize: "11px",
          color: shown ? T.amber : T.textMuted, padding: "3px 6px",
        }}
      >
        {shown ? "hide" : "show"}
      </button>
    </div>
  );
}
