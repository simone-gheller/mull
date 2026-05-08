import { useState, useEffect, useRef } from 'react';

const MONO  = "'JetBrains Mono', monospace";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const MUTED = "#636e84";
const BG    = "#08090c";
const BORDER= "#1e232e";
const SURF  = "#0e1015";
const PRI   = "#f5f7fa";

const STEPS = [
  {
    cmd: "mull secrets get JWT_SECRET --reveal",
    outputDelay: 400,
    output: [
      { text: "eyJhbGciOiJIUzI1NiJ9.Zm9v...", color: AMBER, delay: 0   },
      { text: "↳ logged to audit trail",       color: MUTED, delay: 320 },
    ],
  },
  {
    cmd: "mull secrets list --env staging",
    outputDelay: 500,
    output: [
      { text: "┌ acme-api · staging · 3 secrets",         color: MUTED,  delay: 0   },
      { text: "│ DATABASE_URL      ········  active",       color: GREEN,  delay: 200 },
      { text: "│ JWT_SECRET        ········  rotates 3d",   color: GREEN,  delay: 360 },
      { text: "│ STRIPE_SECRET_KEY ········  active",       color: GREEN,  delay: 500 },
      { text: "└ synced 1s ago",                            color: MUTED,  delay: 660 },
    ],
  },
];

// Final state for reduced-motion and height calculation
const STATIC_LINES = STEPS.flatMap((step, si) => [
  { id: `s${si}`, type: 'cmd', text: step.cmd, typed: step.cmd.length },
  ...step.output.map((o, oi) => ({ id: `s${si}o${oi}`, type: 'output', text: o.text, color: o.color })),
]);

let _id = 0;
const uid = () => String(++_id);

export default function TerminalHero() {
  const [lines, setLines]             = useState([]);
  const [activeCmdId, setActiveCmdId] = useState(null);
  const timers  = useRef([]);
  const ref     = useRef(null);
  const started = useRef(false);

  const schedule = (fn, delay) => {
    const t = setTimeout(fn, delay);
    timers.current.push(t);
  };

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const runStep = (stepIdx) => {
    const step  = STEPS[stepIdx];
    const cmdId = uid();

    setLines(prev => [...prev, { id: cmdId, type: 'cmd', text: step.cmd, typed: 0 }]);
    setActiveCmdId(cmdId);

    for (let i = 1; i <= step.cmd.length; i++) {
      const c = i;
      schedule(() => {
        setLines(prev => prev.map(l => l.id === cmdId ? { ...l, typed: c } : l));
      }, c * 36);
    }

    const typingMs = step.cmd.length * 36;
    schedule(() => {
      step.output.forEach((out, outIdx) => {
        schedule(() => {
          setLines(prev => [...prev, { id: uid(), type: 'output', text: out.text, color: out.color }]);
          // After last output of last step: stop (no restart)
          if (outIdx === step.output.length - 1 && stepIdx < STEPS.length - 1) {
            schedule(() => runStep(stepIdx + 1), 500);
          }
        }, out.delay);
      });
    }, typingMs + step.outputDelay);
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLines(STATIC_LINES);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          observer.disconnect();
          runStep(0);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);

    return () => { observer.disconnect(); clearAll(); };
  }, []);

  return (
    <>
      <style>{`
        .th-cursor {
          display: inline-block; width: 3px; height: 0.85em;
          background: ${GREEN}; margin-left: 2px; vertical-align: text-bottom;
          animation: thBlink 0.52s step-end infinite;
        }
        @keyframes thBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (prefers-reduced-motion: reduce) { .th-cursor { animation: none; opacity: 1; } }
        .th-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
      `}</style>

      <div ref={ref} style={{
        background: BG, border: `1px solid ${BORDER}`, borderRadius: "10px",
        overflow: "hidden", fontFamily: MONO, fontSize: "13px", lineHeight: 1.7,
      }}>
        <span className="th-sr">Terminal demo showing mull CLI commands: get and list</span>

        <div style={{
          background: SURF, borderBottom: `1px solid ${BORDER}`,
          padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px",
        }}>
          {["#f87171","#fbbf24","#4ade80"].map(c => (
            <span key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, opacity: 0.7 }} />
          ))}
          <span style={{ fontSize: "11px", color: MUTED, marginLeft: "6px" }}>bash — mull</span>
        </div>

        {/* Fixed height = final-state content so terminal never grows */}
        <div style={{ padding: "20px 22px", height: "260px", overflow: "hidden" }}>
          {lines.map(line => {
            if (line.type === 'cmd') {
              return (
                <div key={line.id} style={{ display: "flex", gap: "8px", marginBottom: "2px" }}>
                  <span style={{ color: GREEN, userSelect: "none" }}>❯</span>
                  <span style={{ color: PRI }}>
                    {line.text.slice(0, line.typed)}
                    {line.id === activeCmdId && <span className="th-cursor" />}
                  </span>
                </div>
              );
            }
            return (
              <div key={line.id} style={{ paddingLeft: "18px", color: line.color, marginBottom: "2px" }}>
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
