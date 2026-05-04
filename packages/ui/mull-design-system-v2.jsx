import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────
//  MULL DESIGN SYSTEM v2
//  White as primary · DM Sans for display · JetBrains Mono for code
//  Light + Dark mode
// ─────────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    // backgrounds
    bg:       "#08090c",
    surface:  "#0e1015",
    overlay:  "#13161c",
    elevated: "#1a1e26",
    // borders
    border:   "#1e232e",
    borderHover: "#2a3040",
    // text — WHITE is primary
    textPrimary:   "#f5f7fa",
    textSecondary: "#8a95a8",
    textMuted:     "#3d4555",
    textDisabled:  "#1e2330",
    // green — terminal accent only
    termGreen:     "#22c55e",
    termGreenDim:  "#16a34a",
    termGreenBg:   "#0a1f10",
    termGreenBorder: "#14401e",
    // semantic
    amber:    "#f59e0b",
    amberBg:  "#1c1200",
    amberBorder: "#3d2c00",
    red:      "#f87171",
    redBg:    "#1a0808",
    redBorder: "#3d1414",
    blue:     "#60a5fa",
    blueBg:   "#060e1f",
    blueBorder: "#0e2040",
    // logo accent
    logoGlow: "rgba(245,247,250,0.08)",
  },
  light: {
    bg:       "#f4f5f7",
    surface:  "#ffffff",
    overlay:  "#f9fafb",
    elevated: "#f0f1f3",
    border:   "#e2e5ec",
    borderHover: "#c8cdd8",
    textPrimary:   "#0d0f14",
    textSecondary: "#4a5168",
    textMuted:     "#9ba3b8",
    textDisabled:  "#c8cdd8",
    termGreen:     "#16a34a",
    termGreenDim:  "#15803d",
    termGreenBg:   "#f0fdf4",
    termGreenBorder: "#bbf7d0",
    amber:    "#d97706",
    amberBg:  "#fffbeb",
    amberBorder: "#fde68a",
    red:      "#dc2626",
    redBg:    "#fef2f2",
    redBorder: "#fecaca",
    blue:     "#2563eb",
    blueBg:   "#eff6ff",
    blueBorder: "#bfdbfe",
    logoGlow: "rgba(13,15,20,0.06)",
  },
};

const FONTS = {
  display: "'DM Sans', 'Outfit', sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
};

// ── Blinking cursor ────────────────────────────────────────
function Cursor({ color }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 520);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{
      display: "inline-block", width: "0.55em", height: "1.05em",
      background: on ? color : "transparent",
      verticalAlign: "text-bottom", marginLeft: "2px",
      transition: "background 0.05s",
    }} />
  );
}

// ── Typewriter ─────────────────────────────────────────────
function Typewriter({ text, speed = 38, color, onDone }) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOut(""); setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(t); setDone(true); onDone?.(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return (
    <span style={{ color, fontFamily: FONTS.mono }}>
      {out}{!done && <Cursor color={color} />}
    </span>
  );
}

// ── Terminal block ─────────────────────────────────────────
function TermBlock({ lines, T }) {
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); }, []);
  return (
    <div style={{
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
          <TermLine key={i} line={l} active={i <= step}
            onDone={() => setTimeout(() => setStep(s => s + 1), 300)}
            T={T} />
        ))}
      </div>
    </div>
  );
}

function TermLine({ line, active, onDone, T }) {
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

// ── Section label ──────────────────────────────────────────
function SLabel({ children, T }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      marginBottom: "20px", fontFamily: FONTS.mono,
      fontSize: "10px", color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase",
    }}>
      <span style={{ color: T.termGreen }}>//</span>
      {children}
      <span style={{ flex: 1, height: "1px", background: T.border }} />
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────
function Card({ children, title, accent, T, style: sx }) {
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

// ── Button ─────────────────────────────────────────────────
function Btn({ children, variant = "primary", size = "md", icon, disabled, T }) {
  const [h, setH] = useState(false);
  const [a, setA] = useState(false);
  const pad = { sm: "4px 12px", md: "8px 18px", lg: "11px 26px" }[size];
  const fs  = { sm: "11px", md: "12px", lg: "13px" }[size];

  const styles = {
    primary: {
      background: h ? T.textPrimary : T.surface,
      color: h ? T.bg : T.textPrimary,
      border: `1px solid ${h ? T.textPrimary : T.border}`,
      boxShadow: h ? `0 0 0 3px ${T.logoGlow}` : "none",
    },
    secondary: {
      background: "transparent",
      color: h ? T.textSecondary : T.textMuted,
      border: `1px solid ${h ? T.borderHover : T.border}`,
    },
    terminal: {
      background: h ? T.termGreenBg : "transparent",
      color: T.termGreen,
      border: `1px solid ${h ? T.termGreenBorder : T.termGreenBorder}`,
      boxShadow: h ? `0 0 10px rgba(34,197,94,0.12)` : "none",
    },
    danger: {
      background: h ? T.redBg : "transparent",
      color: T.red,
      border: `1px solid ${T.redBorder}`,
    },
    warning: {
      background: h ? T.amberBg : "transparent",
      color: T.amber,
      border: `1px solid ${T.amberBorder}`,
    },
  };

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => { setH(false); setA(false); }}
      onMouseDown={() => setA(true)}
      onMouseUp={() => setA(false)}
      style={{
        padding: pad, fontSize: fs, ...styles[variant],
        fontFamily: FONTS.mono, borderRadius: "4px", cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: "7px",
        transition: "all 0.13s", opacity: disabled ? 0.35 : 1,
        letterSpacing: "0.02em", outline: "none",
        transform: a ? "translateY(1px)" : "none",
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

// ── Badge ──────────────────────────────────────────────────
function Badge({ children, variant = "default", pulse: p, T }) {
  const v = {
    default: { bg: T.elevated, color: T.textSecondary, border: T.border },
    success: { bg: T.termGreenBg, color: T.termGreen, border: T.termGreenBorder },
    warning: { bg: T.amberBg, color: T.amber, border: T.amberBorder },
    danger:  { bg: T.redBg,  color: T.red,   border: T.redBorder },
    info:    { bg: T.blueBg, color: T.blue,  border: T.blueBorder },
  }[variant];
  return (
    <span style={{
      fontFamily: FONTS.mono, fontSize: "10px", letterSpacing: "0.07em",
      padding: "2px 7px", borderRadius: "3px",
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      display: "inline-flex", alignItems: "center", gap: "5px",
      textTransform: "uppercase",
    }}>
      {p && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: v.color, animation: "pulse 1.4s infinite" }} />}
      {children}
    </span>
  );
}

// ── Input ──────────────────────────────────────────────────
function Input({ label, placeholder, type = "text", prefix, suffix, T }) {
  const [f, setF] = useState(false);
  return (
    <div>
      {label && <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>}
      <div style={{
        display: "flex", alignItems: "stretch",
        background: T.surface, borderRadius: "4px",
        border: `1px solid ${f ? T.termGreen : T.border}`,
        boxShadow: f ? `0 0 0 3px ${T.termGreenBg}` : "none",
        transition: "all 0.13s", overflow: "hidden",
      }}>
        {prefix && <span style={{ padding: "0 10px", fontFamily: FONTS.mono, fontSize: "12px", color: T.textMuted, background: T.overlay, borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center" }}>{prefix}</span>}
        <input type={type} placeholder={placeholder} onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "8px 12px", fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }} />
        {suffix && <span style={{ padding: "0 10px", fontFamily: FONTS.mono, fontSize: "11px", color: T.termGreen, display: "flex", alignItems: "center" }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ── Secret row ─────────────────────────────────────────────
function SecretRow({ k, v, env, ago, T }) {
  const [shown, setShown] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "grid", gridTemplateColumns: "190px 1fr 80px 100px 60px",
        gap: "12px", alignItems: "center", padding: "9px 16px",
        borderBottom: `1px solid ${T.border}`,
        background: hov ? T.overlay : "transparent",
        transition: "background 0.1s", fontFamily: FONTS.mono, fontSize: "12px",
      }}>
      <span style={{ color: T.textPrimary }}>{k}</span>
      <span style={{ color: shown ? T.amber : T.textMuted, letterSpacing: shown ? "normal" : "0.12em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {shown ? v : "•".repeat(Math.min(v.length, 24))}
      </span>
      <Badge variant="info" T={T}>{env}</Badge>
      <span style={{ color: T.textMuted, fontSize: "10px" }}>{ago}</span>
      <button onClick={() => setShown(s => !s)}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS.mono, fontSize: "11px", color: shown ? T.amber : T.textMuted, padding: "3px 6px" }}>
        {shown ? "hide" : "show"}
      </button>
    </div>
  );
}

// ── Stat chip ──────────────────────────────────────────────
function Stat({ label, value, sub, T }) {
  return (
    <div style={{ padding: "16px 18px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px" }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontFamily: FONTS.display, fontSize: "26px", fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, marginTop: "6px" }}>{sub}</div>}
    </div>
  );
}

// ── Nav item ───────────────────────────────────────────────
function NavItem({ icon, label, active, badge, T }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px",
        borderRadius: "5px", cursor: "pointer",
        background: active ? T.elevated : h ? T.overlay : "transparent",
        border: `1px solid ${active ? T.border : "transparent"}`,
        fontFamily: FONTS.mono, fontSize: "12px",
        color: active ? T.textPrimary : h ? T.textSecondary : T.textMuted,
        transition: "all 0.1s", userSelect: "none",
      }}>
      <span style={{ fontSize: "13px", opacity: active ? 1 : 0.6 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ background: T.termGreenBg, color: T.termGreen, border: `1px solid ${T.termGreenBorder}`, fontSize: "9px", padding: "1px 6px", borderRadius: "3px", fontFamily: FONTS.mono }}>{badge}</span>}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────
function Toast({ variant, msg, sub, T }) {
  const c = {
    success: { accent: T.termGreen, bg: T.termGreenBg, border: T.termGreenBorder },
    warning: { accent: T.amber, bg: T.amberBg, border: T.amberBorder },
    error:   { accent: T.red, bg: T.redBg, border: T.redBorder },
  }[variant];
  return (
    <div style={{
      padding: "11px 14px", background: c.bg, border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${c.accent}`, borderRadius: "5px",
      fontFamily: FONTS.mono, boxShadow: `0 4px 16px rgba(0,0,0,0.12)`,
    }}>
      <div style={{ fontSize: "12px", color: T.textPrimary, marginBottom: sub ? "3px" : 0 }}>{msg}</div>
      {sub && <div style={{ fontSize: "10px", color: T.textMuted }}>{sub}</div>}
    </div>
  );
}

// ── Swatch ─────────────────────────────────────────────────
function Swatch({ name, hex, tall, T }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ cursor: "pointer", fontFamily: FONTS.mono, fontSize: "10px" }}
      onClick={() => { navigator.clipboard?.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
      <div style={{ height: tall ? "44px" : "28px", background: hex, borderRadius: "3px", border: `1px solid ${T.border}`, marginBottom: "5px" }} />
      <div style={{ color: T.textSecondary }}>{name}</div>
      <div style={{ color: T.textMuted }}>{copied ? "copied!" : hex}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════
export default function MullDS() {
  const [mode, setMode] = useState("dark");
  const [tab, setTab] = useState("overview");
  const T = THEMES[mode];

  const tabs = ["overview", "colors", "typography", "components", "patterns"];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary, transition: "background 0.25s, color 0.25s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: ${T.textDisabled}; font-family: ${FONTS.mono}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%{opacity:0.6} 50%{opacity:1} 100%{opacity:0.6} }
      `}</style>

      {/* ── Topbar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 28px", height: "48px",
        display: "flex", alignItems: "center", gap: "0",
        backdropFilter: "blur(8px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "9px", paddingRight: "20px", marginRight: "8px", borderRight: `1px solid ${T.border}` }}>
          <div style={{
            width: "24px", height: "24px", borderRadius: "5px",
            background: T.elevated, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: T.textPrimary,
          }}>▣</div>
          <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "15px", color: T.textPrimary, letterSpacing: "-0.01em" }}>
            mull
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted, letterSpacing: "0.05em" }}>
            design system
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", height: "100%" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: FONTS.mono, fontSize: "11px",
                color: tab === t ? T.textPrimary : T.textMuted,
                padding: "0 14px", height: "100%",
                borderBottom: `2px solid ${tab === t ? T.textPrimary : "transparent"}`,
                letterSpacing: "0.03em", transition: "all 0.13s",
              }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Mode toggle */}
        <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")}
          style={{
            background: T.elevated, border: `1px solid ${T.border}`, borderRadius: "5px",
            cursor: "pointer", fontFamily: FONTS.mono, fontSize: "11px",
            color: T.textSecondary, padding: "5px 12px",
            display: "flex", alignItems: "center", gap: "7px",
            transition: "all 0.2s",
          }}>
          <span>{mode === "dark" ? "☀" : "●"}</span>
          {mode === "dark" ? "light" : "dark"}
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "40px 28px", maxWidth: "1060px", margin: "0 auto", animation: "fadeUp 0.25s ease" }} key={tab}>

        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <>
            <div style={{ marginBottom: "52px" }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "14px" }}>
                ▣ mull / design system / v0.1
              </div>
              <h1 style={{
                fontFamily: FONTS.display, fontWeight: 700, fontSize: "48px",
                color: T.textPrimary, letterSpacing: "-0.035em", lineHeight: 1.05, marginBottom: "12px",
              }}>
                Secure by design.<br />
                <span style={{ color: T.textMuted, fontWeight: 400 }}>Terminal at heart.</span>
              </h1>
              <p style={{ fontFamily: FONTS.display, fontSize: "16px", color: T.textSecondary, maxWidth: "460px", lineHeight: 1.65, fontWeight: 400 }}>
                Mull's design language pairs clean display type with monospace code elements — professional on the surface, nerd-native underneath.
              </p>
            </div>

            <div style={{ marginBottom: "36px" }}>
              <SLabel T={T}>Live terminal</SLabel>
              <TermBlock T={T} lines={[
                { cmd: "secrets list --env production", out: <div>
                    <div style={{ color: T.textMuted }}>┌ acme-api · production · 3 secrets</div>
                    <div>│ <span style={{ color: T.termGreen }}>DATABASE_URL</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style={{ letterSpacing: "0.12em", color: T.textMuted }}>••••••••••••••••</span> &nbsp; <Badge variant="success" T={T}>active</Badge></div>
                    <div>│ <span style={{ color: T.termGreen }}>JWT_SECRET</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style={{ letterSpacing: "0.12em", color: T.textMuted }}>••••••••••••••••</span> &nbsp; <Badge variant="warning" T={T}>rotates in 3d</Badge></div>
                    <div>│ <span style={{ color: T.termGreen }}>STRIPE_SECRET_KEY</span> &nbsp; <span style={{ letterSpacing: "0.12em", color: T.textMuted }}>••••••••••••••••</span> &nbsp; <Badge variant="success" T={T}>active</Badge></div>
                    <div style={{ color: T.textMuted }}>└ synced 1s ago</div>
                  </div>
                },
                { cmd: "secrets get JWT_SECRET --reveal", out: <span style={{ color: T.amber }}>eyJhbGciOiJIUzI1NiJ9.Zm9v...</span> },
              ]} />
            </div>

            {/* Principles */}
            <SLabel T={T}>Principles</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
              {[
                { glyph: "◈", title: "Two voices", desc: "Display type for navigation and meaning. Monospace for everything that is data — keys, values, paths, timestamps." },
                { glyph: "▣", title: "White is primary", desc: "No accent color competes for attention. White carries hierarchy; green belongs only to the terminal layer." },
                { glyph: "◇", title: "Hidden by default", desc: "Secret values are masked until explicitly revealed. The UI never makes sensitive data ambient." },
              ].map(p => (
                <div key={p.title} style={{ padding: "20px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px" }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: "20px", color: T.termGreen, marginBottom: "10px", opacity: 0.7 }}>{p.glyph}</div>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "14px", color: T.textPrimary, marginBottom: "6px" }}>{p.title}</div>
                  <div style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── COLORS ─── */}
        {tab === "colors" && (
          <>
            <SLabel T={T}>Neutrals — the whole palette</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "12px", marginBottom: "32px" }}>
              {[
                { name: "bg", hex: T.bg }, { name: "surface", hex: T.surface },
                { name: "overlay", hex: T.overlay }, { name: "elevated", hex: T.elevated },
                { name: "border", hex: T.border },
              ].map(s => <Swatch key={s.name} {...s} T={T} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "32px" }}>
              {[
                { name: "text/primary", hex: T.textPrimary, tall: true },
                { name: "text/secondary", hex: T.textSecondary, tall: true },
                { name: "text/muted", hex: T.textMuted, tall: true },
                { name: "text/disabled", hex: T.textDisabled, tall: true },
              ].map(s => <Swatch key={s.name} {...s} T={T} />)}
            </div>

            <SLabel T={T}>Terminal green — accent only</SLabel>
            <Card T={T} style={{ marginBottom: "28px" }}>
              <div style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, marginBottom: "16px", lineHeight: 1.6 }}>
                Green is reserved for terminal elements: prompts, status badges, CLI output, cursor. It never appears on primary buttons or headings — that would dilute the signal.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                {[
                  { name: "termGreen", hex: T.termGreen, tall: true },
                  { name: "termGreenBg", hex: T.termGreenBg, tall: true },
                  { name: "termGreenBorder", hex: T.termGreenBorder, tall: true },
                ].map(s => <Swatch key={s.name} {...s} T={T} />)}
              </div>
            </Card>

            <SLabel T={T}>Semantic</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
              {[
                { label: "amber — secret revealed", items: [
                  { name: "amber", hex: T.amber }, { name: "amberBg", hex: T.amberBg }, { name: "amberBorder", hex: T.amberBorder },
                ]},
                { label: "red — danger / revoke", items: [
                  { name: "red", hex: T.red }, { name: "redBg", hex: T.redBg }, { name: "redBorder", hex: T.redBorder },
                ]},
                { label: "blue — info / env tags", items: [
                  { name: "blue", hex: T.blue }, { name: "blueBg", hex: T.blueBg }, { name: "blueBorder", hex: T.blueBorder },
                ]},
              ].map(group => (
                <Card key={group.label} title={group.label} T={T}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {group.items.map(s => <Swatch key={s.name} {...s} T={T} />)}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* ─── TYPOGRAPHY ─── */}
        {tab === "typography" && (
          <>
            <SLabel T={T}>Type system — two voices</SLabel>
            <Card T={T} title="DM Sans — display, headings, body prose" accent="green" style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {[
                  { role: "display / hero", size: "40px", weight: 700, text: "Secrets management for teams that ship.", tracking: "-0.03em" },
                  { role: "heading / h2", size: "24px", weight: 600, text: "Production Environment", tracking: "-0.02em" },
                  { role: "heading / h3", size: "18px", weight: 600, text: "API Token Settings", tracking: "-0.01em" },
                  { role: "body / large", size: "15px", weight: 400, text: "Manage all your secrets in one place. Push, pull, rotate — all from the CLI.", tracking: "normal" },
                  { role: "body / small", size: "13px", weight: 400, text: "Last updated 2 hours ago. Changes propagate in real-time to all connected clients.", tracking: "normal" },
                ].map(t => (
                  <div key={t.role} style={{ display: "flex", gap: "20px", alignItems: "baseline", paddingBottom: "16px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ width: "150px", flexShrink: 0 }}>
                      <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>{t.role}</div>
                      <div style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textDisabled }}>{t.size} · w{t.weight}</div>
                    </div>
                    <div style={{ fontFamily: FONTS.display, fontSize: t.size, fontWeight: t.weight, color: T.textPrimary, letterSpacing: t.tracking, lineHeight: 1.2 }}>{t.text}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card T={T} title="JetBrains Mono — code, keys, values, meta" accent="green">
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {[
                  { role: "key name", size: "14px", weight: 400, text: "DATABASE_URL", color: T.textPrimary },
                  { role: "prompt", size: "13px", weight: 400, text: "❯ secrets push --env production", color: T.termGreen },
                  { role: "value / hidden", size: "13px", weight: 400, text: "•••••••••••••••••••••", color: T.textMuted, tracking: "0.12em" },
                  { role: "value / revealed", size: "13px", weight: 400, text: "postgres://app:r4nd0m@db.prod:5432/app", color: T.amber },
                  { role: "label / caps", size: "10px", weight: 400, text: "ENVIRONMENT · VERSION · LAST_UPDATED", color: T.textMuted, tracking: "0.12em" },
                  { role: "badge text", size: "10px", weight: 400, text: "ACTIVE · STAGING · ROTATING", color: T.termGreen, tracking: "0.07em" },
                ].map(t => (
                  <div key={t.role} style={{ display: "flex", gap: "20px", alignItems: "center", paddingBottom: "14px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ width: "150px", flexShrink: 0, fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>{t.role}</div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: t.size, fontWeight: t.weight, color: t.color, letterSpacing: t.tracking }}>{t.text}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ─── COMPONENTS ─── */}
        {tab === "components" && (
          <>
            <SLabel T={T}>Buttons</SLabel>
            <Card T={T} style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, marginBottom: "10px" }}>// primary — white fill on hover</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <Btn T={T} variant="primary" size="sm">sync</Btn>
                  <Btn T={T} variant="primary">push secrets</Btn>
                  <Btn T={T} variant="primary" size="lg" icon="▣">deploy →</Btn>
                  <Btn T={T} variant="primary" disabled>disabled</Btn>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, marginBottom: "10px" }}>// secondary — ghost</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <Btn T={T} variant="secondary">cancel</Btn>
                  <Btn T={T} variant="secondary" icon="≡">audit log</Btn>
                  <Btn T={T} variant="secondary" size="sm">view docs</Btn>
                </div>
              </div>
              <div style={{ marginBottom: "4px" }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, marginBottom: "10px" }}>// terminal, danger, warning</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <Btn T={T} variant="terminal" icon="❯">run command</Btn>
                  <Btn T={T} variant="danger">revoke token</Btn>
                  <Btn T={T} variant="warning">rotate key</Btn>
                </div>
              </div>
            </Card>

            <SLabel T={T}>Badges & Status</SLabel>
            <Card T={T} style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <Badge T={T} variant="success" pulse>live</Badge>
                <Badge T={T} variant="success">synced</Badge>
                <Badge T={T} variant="warning" pulse>rotating</Badge>
                <Badge T={T} variant="warning">expiring</Badge>
                <Badge T={T} variant="danger" pulse>breached</Badge>
                <Badge T={T} variant="danger">revoked</Badge>
                <Badge T={T} variant="info">staging</Badge>
                <Badge T={T} variant="info">production</Badge>
                <Badge T={T}>default</Badge>
              </div>
            </Card>

            <SLabel T={T}>Inputs</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
              <Input T={T} label="Secret Key" placeholder="DATABASE_URL" />
              <Input T={T} label="Secret Value" type="password" placeholder="Enter value…" suffix="encrypt" />
              <Input T={T} label="Endpoint" prefix="https://" placeholder="api.yourdomain.com" />
              <Input T={T} label="Search" prefix="/" placeholder="filter secrets…" />
            </div>

            <SLabel T={T}>Toasts</SLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "360px" }}>
              <Toast T={T} variant="success" msg="12 secrets pushed to production" sub="acme-api · 340ms" />
              <Toast T={T} variant="warning" msg="JWT_SECRET expires in 3 days" sub="consider rotating before expiry" />
              <Toast T={T} variant="error" msg="Access denied: missing scope" sub="token requires secrets:write" />
            </div>
          </>
        )}

        {/* ─── PATTERNS ─── */}
        {tab === "patterns" && (
          <>
            <SLabel T={T}>Dashboard stats</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "32px" }}>
              <Stat T={T} label="Total secrets" value="247" sub="↑ +12 this week" />
              <Stat T={T} label="Environments" value="6" />
              <Stat T={T} label="API calls / day" value="1.2k" sub="↑ 8% vs last week" />
              <Stat T={T} label="Team members" value="14" />
            </div>

            <SLabel T={T}>Secrets table</SLabel>
            <Card T={T} style={{ marginBottom: "32px" }}>
              <div style={{ padding: "0", margin: "-18px" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "190px 1fr 80px 100px 60px", gap: "12px",
                  padding: "8px 16px", borderBottom: `1px solid ${T.border}`,
                  fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  <span>key</span><span>value</span><span>env</span><span>updated</span><span></span>
                </div>
                <SecretRow T={T} k="DATABASE_URL" v="postgres://app:r4nd0m@db.prod:5432/app" env="prod" ago="2h ago" />
                <SecretRow T={T} k="JWT_SECRET" v="eyJhbGciOiJIUzI1NiJ9.secret.here" env="prod" ago="3d ago" />
                <SecretRow T={T} k="STRIPE_SECRET_KEY" v="sk_live_4xK9mN2pQ8rL1vT7wX3y" env="prod" ago="7d ago" />
                <SecretRow T={T} k="REDIS_URL" v="redis://:pass@cache.internal:6379/0" env="staging" ago="1d ago" />
              </div>
            </Card>

            <SLabel T={T}>Navigation sidebar</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "24px", marginBottom: "32px" }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px", padding: "12px 8px" }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px 10px" }}>acme-corp</div>
                {[
                  { icon: "▣", label: "secrets", active: true, badge: "48" },
                  { icon: "◈", label: "environments" },
                  { icon: "◇", label: "access tokens" },
                  { icon: "▷", label: "integrations" },
                  { icon: "≡", label: "audit log" },
                  { icon: "⊙", label: "settings" },
                ].map(n => <NavItem key={n.label} {...n} T={T} />)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: FONTS.mono, fontSize: "12px" }}>
                  {["acme-corp", "api-service", "production", "secrets"].map((seg, i, arr) => (
                    <span key={seg} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {i > 0 && <span style={{ color: T.textMuted }}>/</span>}
                      <span style={{ color: i === arr.length - 1 ? T.textPrimary : T.textMuted }}>{seg}</span>
                    </span>
                  ))}
                </div>
                <div style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, lineHeight: 1.6 }}>
                  Path breadcrumbs use <code style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.termGreen, background: T.termGreenBg, padding: "1px 5px", borderRadius: "3px" }}>/</code> as separator, reinforcing the filesystem mental model developers already have.
                </div>
              </div>
            </div>

            <SLabel T={T}>Typography in context — card anatomy</SLabel>
            <Card T={T} title="project / acme-api" accent="green">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontFamily: FONTS.display, fontSize: "20px", fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.01em", marginBottom: "4px" }}>
                    acme-api
                  </h2>
                  <p style={{ fontFamily: FONTS.display, fontSize: "13px", color: T.textSecondary, fontWeight: 400 }}>
                    Main backend API for Acme Corp — 4 environments, 48 secrets
                  </p>
                </div>
                <Badge T={T} variant="success" pulse>live</Badge>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Btn T={T} variant="primary" size="sm">open</Btn>
                <Btn T={T} variant="secondary" size="sm">settings</Btn>
                <Btn T={T} variant="terminal" size="sm" icon="❯">clone</Btn>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
