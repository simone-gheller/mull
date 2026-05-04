import { useState } from 'react';
import { Typewriter } from './Typewriter.jsx';

export function TermLine({ line, active, onDone, T }) {
  const [showOut, setShowOut] = useState(false);
  if (!active) return null;
  return (
    <div style={{ marginBottom: "6px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <span style={{ color: T.termGreen }}>❯</span>
        <Typewriter text={line.cmd} color={T.textPrimary}
          onDone={() => { setTimeout(() => setShowOut(true), 180); onDone?.(); }} />
      </div>
      {showOut && line.out && (
        <div style={{ paddingLeft: "18px", marginTop: "3px", color: line.outColor || T.textSecondary, lineHeight: 1.7 }}>
          {line.out}
        </div>
      )}
    </div>
  );
}
