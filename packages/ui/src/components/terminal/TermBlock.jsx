import { useState, useEffect, useRef } from 'react';
import { FONTS } from '../../tokens.js';
import { TermLine } from './TermLine.jsx';

export function TermBlock({ lines, T }) {
  const [step, setStep] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStep(0); observer.disconnect(); } },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: "6px", overflow: "hidden",
      fontFamily: FONTS.mono, fontSize: "12px",
    }}>
      <div style={{
        background: T.overlay, borderBottom: `1px solid ${T.border}`,
        padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px",
      }}>
        {["#f87171","#fbbf24","#4ade80"].map(c => (
          <span key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, opacity: 0.7 }} />
        ))}
        <span style={{ fontSize: "11px", color: T.textMuted, marginLeft: "6px" }}>
          bash — mull
        </span>
      </div>
      <div style={{ padding: "16px 18px", minHeight: "140px" }}>
        {lines.map((l, i) => (
          <TermLine key={i} line={l} active={step >= 0 && i <= step}
            onDone={() => setTimeout(() => setStep(s => s + 1), 300)}
            T={T} />
        ))}
      </div>
    </div>
  );
}
