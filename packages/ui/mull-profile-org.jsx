import { useState } from "react";

const THEMES = {
  dark: {
    bg: "#08090c", surface: "#0e1015", overlay: "#13161c", elevated: "#1a1e26",
    border: "#1e232e", borderHover: "#2a3040",
    textPrimary: "#f5f7fa", textSecondary: "#8a95a8", textMuted: "#3d4555", textDisabled: "#1e2330",
    termGreen: "#22c55e", termGreenDim: "#16a34a", termGreenBg: "#0a1f10", termGreenBorder: "#14401e",
    amber: "#f59e0b", amberBg: "#1c1200", amberBorder: "#3d2c00",
    red: "#f87171", redBg: "#1a0808", redBorder: "#3d1414",
    blue: "#60a5fa", blueBg: "#060e1f", blueBorder: "#0e2040",
    logoGlow: "rgba(245,247,250,0.08)",
  },
  light: {
    bg: "#f4f5f7", surface: "#ffffff", overlay: "#f9fafb", elevated: "#f0f1f3",
    border: "#e2e5ec", borderHover: "#c8cdd8",
    textPrimary: "#0d0f14", textSecondary: "#4a5168", textMuted: "#9ba3b8", textDisabled: "#c8cdd8",
    termGreen: "#16a34a", termGreenDim: "#15803d", termGreenBg: "#f0fdf4", termGreenBorder: "#bbf7d0",
    amber: "#d97706", amberBg: "#fffbeb", amberBorder: "#fde68a",
    red: "#dc2626", redBg: "#fef2f2", redBorder: "#fecaca",
    blue: "#2563eb", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
    logoGlow: "rgba(13,15,20,0.06)",
  },
};
const FONTS = { display: "'DM Sans', sans-serif", mono: "'JetBrains Mono', monospace" };

// ── Primitives ─────────────────────────────────────────────

function Badge({ variant = "default", children, pulse: p, T }) {
  const v = {
    default: { bg: T.elevated, color: T.textSecondary, border: T.border },
    success: { bg: T.termGreenBg, color: T.termGreen, border: T.termGreenBorder },
    warning: { bg: T.amberBg, color: T.amber, border: T.amberBorder },
    danger:  { bg: T.redBg, color: T.red, border: T.redBorder },
    info:    { bg: T.blueBg, color: T.blue, border: T.blueBorder },
  }[variant];
  return (
    <span style={{
      fontFamily: FONTS.mono, fontSize: "10px", letterSpacing: "0.07em",
      padding: "2px 8px", borderRadius: "3px",
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      display: "inline-flex", alignItems: "center", gap: "5px",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {p && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: v.color, animation: "pulse 1.4s infinite", flexShrink: 0 }} />}
      {children}
    </span>
  );
}

function Btn({ children, variant = "primary", size = "md", icon, disabled, onClick, T }) {
  const [h, setH] = useState(false);
  const pad = { sm: "4px 12px", md: "8px 18px", lg: "11px 26px" }[size];
  const fs  = { sm: "11px", md: "12px", lg: "13px" }[size];
  const styles = {
    primary: { background: h ? T.textPrimary : T.surface, color: h ? T.bg : T.textPrimary, border: `1px solid ${h ? T.textPrimary : T.border}` },
    secondary: { background: "transparent", color: h ? T.textSecondary : T.textMuted, border: `1px solid ${h ? T.borderHover : T.border}` },
    terminal: { background: h ? T.termGreenBg : "transparent", color: T.termGreen, border: `1px solid ${T.termGreenBorder}` },
    danger: { background: h ? T.redBg : "transparent", color: T.red, border: `1px solid ${T.redBorder}` },
    warning: { background: h ? T.amberBg : "transparent", color: T.amber, border: `1px solid ${T.amberBorder}` },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: pad, fontSize: fs, ...styles[variant], fontFamily: FONTS.mono, borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "7px",
        transition: "all 0.13s", opacity: disabled ? 0.35 : 1, letterSpacing: "0.02em", outline: "none" }}>
      {icon && <span>{icon}</span>}{children}
    </button>
  );
}

function Input({ label, placeholder, type = "text", value, onChange, hint, T }) {
  const [f, setF] = useState(false);
  return (
    <div>
      {label && <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width: "100%", background: T.surface, border: `1px solid ${f ? T.termGreen : T.border}`,
          boxShadow: f ? `0 0 0 3px ${T.termGreenBg}` : "none", borderRadius: "4px", outline: "none",
          padding: "8px 12px", fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary, transition: "all 0.13s" }} />
      {hint && <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginTop: "4px" }}>{hint}</div>}
    </div>
  );
}

function Divider({ T }) {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: "24px 0" }} />;
}

function SLabel({ children, T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px",
      fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
      <span style={{ color: T.termGreen }}>//</span>{children}
      <span style={{ flex: 1, height: "1px", background: T.border }} />
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────
function Avatar({ name, size = 36, role, T }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: size, height: size, borderRadius: "6px", flexShrink: 0,
        background: `hsl(${hue}, 20%, ${T === THEMES.dark ? "18%" : "88%"})`,
        border: `1px solid hsl(${hue}, 30%, ${T === THEMES.dark ? "25%" : "75%"})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONTS.mono, fontSize: size * 0.34 + "px",
        color: `hsl(${hue}, 60%, ${T === THEMES.dark ? "70%" : "35%"})`,
        letterSpacing: "0.05em",
      }}>
        {initials}
      </div>
      {role && (
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }}>{name}</div>
          <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>{role}</div>
        </div>
      )}
    </div>
  );
}

// ── Plan badge strip ───────────────────────────────────────
function PlanStrip({ plan, T }) {
  const plans = {
    hobby:   { label: "Hobby", color: T.textMuted, border: T.border, bg: T.elevated },
    starter: { label: "Starter", color: T.blue, border: T.blueBorder, bg: T.blueBg },
    team:    { label: "Team", color: T.termGreen, border: T.termGreenBorder, bg: T.termGreenBg },
    growth:  { label: "Growth", color: T.amber, border: T.amberBorder, bg: T.amberBg },
  };
  const p = plans[plan] || plans.hobby;
  return (
    <span style={{
      fontFamily: FONTS.mono, fontSize: "11px", letterSpacing: "0.06em",
      padding: "3px 10px", borderRadius: "3px",
      background: p.bg, color: p.color, border: `1px solid ${p.border}`,
      textTransform: "uppercase",
    }}>
      {p.label}
    </span>
  );
}

// ── Section container ──────────────────────────────────────
function Section({ title, description, children, T, danger }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${danger ? T.redBorder : T.border}`,
      borderRadius: "6px", overflow: "hidden", marginBottom: "16px",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${danger ? T.redBorder : T.border}`, background: danger ? T.redBg : T.overlay }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "14px", color: danger ? T.red : T.textPrimary, marginBottom: description ? "2px" : 0 }}>{title}</div>
        {description && <div style={{ fontFamily: FONTS.display, fontSize: "12px", color: T.textMuted }}>{description}</div>}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

// ── Member row ─────────────────────────────────────────────
function MemberRow({ name, email, role, joinedAgo, isYou, T }) {
  const [hover, setHover] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const roles = ["owner", "admin", "member", "viewer"];
  const roleColors = { owner: "warning", admin: "info", member: "success", viewer: "default" };
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); }}
      style={{
        display: "grid", gridTemplateColumns: "1fr auto auto auto",
        gap: "16px", alignItems: "center", padding: "10px 0",
        borderBottom: `1px solid ${T.border}`, transition: "background 0.1s",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Avatar name={name} size={32} T={T} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }}>{name}</span>
            {isYou && <span style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted, border: `1px solid ${T.border}`, padding: "1px 5px", borderRadius: "2px" }}>you</span>}
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>{email}</div>
        </div>
      </div>
      <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>{joinedAgo}</span>
      <div style={{ position: "relative" }}>
        <div onClick={() => !isYou && setRoleOpen(o => !o)}
          style={{
            cursor: isYou ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
          <Badge variant={roleColors[role]} T={T}>{role}</Badge>
          {!isYou && <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>▾</span>}
        </div>
        {roleOpen && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
            background: T.elevated, border: `1px solid ${T.border}`, borderRadius: "5px",
            overflow: "hidden", minWidth: "120px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}>
            {roles.map(r => (
              <div key={r} onClick={() => setRoleOpen(false)}
                style={{ padding: "8px 14px", fontFamily: FONTS.mono, fontSize: "11px",
                  color: r === role ? T.textPrimary : T.textSecondary,
                  background: r === role ? T.overlay : "transparent",
                  cursor: "pointer" }}>
                {r}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: "60px", display: "flex", justifyContent: "flex-end" }}>
        {hover && !isYou && (
          <button style={{ background: "none", border: "none", cursor: "pointer",
            fontFamily: FONTS.mono, fontSize: "11px", color: T.red, padding: "3px 6px" }}>
            remove
          </button>
        )}
      </div>
    </div>
  );
}

// ── Invite row ─────────────────────────────────────────────
function InviteRow({ email, role, sentAgo, T }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto auto auto",
      gap: "16px", alignItems: "center", padding: "9px 0",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: T.elevated,
          border: `1px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONTS.mono, fontSize: "12px", color: T.textMuted }}>?</div>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textSecondary }}>{email}</div>
          <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>invite pending</div>
        </div>
      </div>
      <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted }}>{sentAgo}</span>
      <Badge variant="warning" T={T}>{role}</Badge>
      <button style={{ background: "none", border: "none", cursor: "pointer",
        fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted, padding: "3px 6px" }}>
        revoke
      </button>
    </div>
  );
}

// ── Token row ──────────────────────────────────────────────
function TokenRow({ name, prefix, scope, lastUsed, created, T }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gridTemplateColumns: "1fr auto auto auto",
        gap: "16px", alignItems: "center", padding: "10px 0",
        borderBottom: `1px solid ${T.border}`,
        transition: "background 0.1s",
      }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }}>{name}</span>
          <code style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.amber,
            background: T.amberBg, border: `1px solid ${T.amberBorder}`, padding: "1px 6px", borderRadius: "3px" }}>
            {prefix}...
          </code>
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginTop: "2px" }}>
          created {created} · last used {lastUsed}
        </div>
      </div>
      <Badge variant="info" T={T}>{scope}</Badge>
      {hover
        ? <Btn variant="danger" size="sm" T={T}>revoke</Btn>
        : <div style={{ width: "60px" }} />
      }
    </div>
  );
}

// ── Audit row ──────────────────────────────────────────────
function AuditRow({ actor, action, target, time, T }) {
  const actionColors = {
    push: T.termGreen, pull: T.blue, rotate: T.amber,
    revoke: T.red, invite: T.blue, delete: T.red,
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto",
      gap: "12px", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
      <Avatar name={actor} size={28} T={T} />
      <div>
        <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textSecondary }}>{actor} </span>
        <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: actionColors[action] || T.textMuted }}>{action} </span>
        <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textPrimary }}>{target}</span>
      </div>
      <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, whiteSpace: "nowrap" }}>{time}</span>
    </div>
  );
}

// ── Usage bar ──────────────────────────────────────────────
function UsageBar({ label, used, total, unit, T }) {
  const pct = Math.min((used / total) * 100, 100);
  const color = pct > 85 ? T.red : pct > 65 ? T.amber : T.termGreen;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textSecondary }}>{label}</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted }}>
          {used} / {total} {unit}
        </span>
      </div>
      <div style={{ height: "4px", background: T.elevated, borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color,
          borderRadius: "2px", transition: "width 0.6s ease",
          boxShadow: `0 0 6px ${color}40` }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PAGE VIEWS
// ══════════════════════════════════════════════════════════

function ProfilePage({ T }) {
  return (
    <div>
      {/* Hero profile strip */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px",
        padding: "24px", marginBottom: "16px",
        display: "flex", alignItems: "flex-start", gap: "20px",
      }}>
        <div style={{ position: "relative" }}>
          <Avatar name="Simone Russo" size={64} T={T} />
          <button style={{
            position: "absolute", bottom: "-4px", right: "-4px",
            width: "20px", height: "20px", borderRadius: "4px",
            background: T.elevated, border: `1px solid ${T.border}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted,
          }}>✎</button>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <h1 style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "18px", color: T.textPrimary }}>Simone Russo</h1>
            <Badge variant="warning" T={T}>owner</Badge>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted, marginBottom: "10px" }}>
            simone@acme.io · joined 6 months ago
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <PlanStrip plan="team" T={T} />
            <Badge variant="success" pulse T={T}>active</Badge>
          </div>
        </div>
        <Btn variant="secondary" size="sm" T={T}>edit profile</Btn>
      </div>

      {/* Personal info */}
      <Section title="Personal Information" description="Your public profile details" T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <Input label="Full Name" value="Simone Russo" T={T} />
          <Input label="Email" value="simone@acme.io" type="email" T={T} />
          <Input label="Username" value="simone-r" T={T}
            hint="Used in CLI: mull login --user simone-r" />
          <Input label="Timezone" value="Europe/Rome" T={T} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn variant="primary" size="sm" T={T}>save changes</Btn>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" description="Password and two-factor authentication" T={T}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { label: "Password", value: "Last changed 30 days ago", action: "change", status: null },
            { label: "Two-factor auth", value: "Authenticator app enabled", action: "manage", status: "success" },
            { label: "Active sessions", value: "3 devices — MacBook Pro, iPhone 14, CLI", action: "view all", status: null },
          ].map(row => (
            <div key={row.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", background: T.overlay, border: `1px solid ${T.border}`, borderRadius: "4px",
            }}>
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary, marginBottom: "2px" }}>{row.label}</div>
                <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>{row.value}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {row.status && <Badge variant={row.status} T={T}>enabled</Badge>}
                <Btn variant="secondary" size="sm" T={T}>{row.action}</Btn>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* API Tokens */}
      <Section title="Personal API Tokens" description="Tokens scoped to your user — not shared with the org" T={T}>
        <div style={{ marginBottom: "16px" }}>
          <TokenRow name="local-dev" prefix="mull_sk_4xK9" scope="read:all" lastUsed="2h ago" created="30d ago" T={T} />
          <TokenRow name="ci-personal" prefix="mull_sk_9mN2" scope="read:secrets" lastUsed="1d ago" created="60d ago" T={T} />
        </div>
        <Btn variant="terminal" size="sm" icon="+" T={T}>new token</Btn>
      </Section>

      {/* Danger */}
      <Section title="Danger Zone" description="Irreversible actions on your account" T={T} danger>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary, marginBottom: "2px" }}>Delete account</div>
            <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>Permanently removes your user and leaves all orgs</div>
          </div>
          <Btn variant="danger" size="sm" T={T}>delete account</Btn>
        </div>
      </Section>
    </div>
  );
}

function OrgPage({ T }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [tab, setTab] = useState("members");
  const orgTabs = ["members", "tokens", "billing", "audit", "settings"];

  return (
    <div>
      {/* Org header */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px",
        padding: "20px 24px", marginBottom: "16px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "8px", flexShrink: 0,
          background: T.elevated, border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONTS.mono, fontSize: "20px", color: T.textPrimary,
        }}>▣</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "18px", color: T.textPrimary }}>acme-corp</h1>
            <PlanStrip plan="team" T={T} />
            <Badge variant="success" pulse T={T}>active</Badge>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted }}>
            slug: acme-corp · 14 members · 247 secrets · created 8 months ago
          </div>
        </div>
        <Btn variant="secondary" size="sm" T={T}>org settings</Btn>
      </div>

      {/* Inner tabs */}
      <div style={{
        display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: "24px",
        background: T.surface, borderRadius: "6px 6px 0 0", overflow: "hidden",
        border: `1px solid ${T.border}`, borderBottom: "none",
        paddingLeft: "8px",
      }}>
        {orgTabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: FONTS.mono, fontSize: "11px", letterSpacing: "0.04em",
            color: tab === t ? T.textPrimary : T.textMuted,
            padding: "12px 16px", borderBottom: `2px solid ${tab === t ? T.textPrimary : "transparent"}`,
            transition: "all 0.12s",
          }}>{t}</button>
        ))}
      </div>

      {/* ── MEMBERS tab ── */}
      {tab === "members" && (
        <div>
          {/* Invite bar */}
          <div style={{
            display: "flex", gap: "10px", marginBottom: "24px",
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px", padding: "16px",
          }}>
            <div style={{ flex: 1 }}>
              <Input placeholder="colleague@company.com" value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)} T={T} />
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <select style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "4px",
                padding: "8px 12px", fontFamily: FONTS.mono, fontSize: "12px", color: T.textSecondary, outline: "none" }}>
                <option>member</option><option>admin</option><option>viewer</option>
              </select>
              <Btn variant="primary" size="md" T={T}>+ send invite</Btn>
            </div>
          </div>

          {/* Usage */}
          <div style={{ marginBottom: "20px" }}>
            <UsageBar label="seats" used={14} total={25} unit="members" T={T} />
          </div>

          {/* Members */}
          <Section title="Active Members" T={T}>
            <MemberRow name="Simone Russo" email="simone@acme.io" role="owner" joinedAgo="8mo ago" isYou T={T} />
            <MemberRow name="Laura Bianchi" email="laura@acme.io" role="admin" joinedAgo="6mo ago" T={T} />
            <MemberRow name="Marco Verdi" email="marco@acme.io" role="member" joinedAgo="4mo ago" T={T} />
            <MemberRow name="Giulia Rossi" email="giulia@acme.io" role="viewer" joinedAgo="2mo ago" T={T} />
          </Section>

          {/* Pending invites */}
          <Section title="Pending Invites" T={T}>
            <InviteRow email="newdev@acme.io" role="member" sentAgo="sent 2d ago" T={T} />
            <InviteRow email="designer@acme.io" role="viewer" sentAgo="sent 5d ago" T={T} />
          </Section>
        </div>
      )}

      {/* ── TOKENS tab ── */}
      {tab === "tokens" && (
        <div>
          <Section title="Organization API Tokens" description="Shared tokens — scoped to this org, visible to admins" T={T}>
            <TokenRow name="github-actions-prod" prefix="mull_sk_7pR3" scope="read:secrets" lastUsed="10m ago" created="3mo ago" T={T} />
            <TokenRow name="vercel-deploy" prefix="mull_sk_2qN8" scope="read:secrets" lastUsed="1h ago" created="2mo ago" T={T} />
            <TokenRow name="datadog-integration" prefix="mull_sk_5tX1" scope="read:all" lastUsed="never" created="1mo ago" T={T} />
            <div style={{ marginTop: "16px" }}>
              <Btn variant="terminal" size="sm" icon="+" T={T}>new org token</Btn>
            </div>
          </Section>
        </div>
      )}

      {/* ── BILLING tab ── */}
      {tab === "billing" && (
        <div>
          {/* Current plan */}
          <div style={{
            background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
            borderRadius: "6px", padding: "20px 24px", marginBottom: "16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.12em", marginBottom: "6px" }}>CURRENT PLAN</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "28px", color: T.textPrimary }}>$99</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted }}>/month</span>
                <PlanStrip plan="team" T={T} />
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: "12px", color: T.textSecondary, marginTop: "4px" }}>
                Next billing date: June 1, 2026 · Visa ending 4242
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn variant="secondary" size="sm" T={T}>manage billing</Btn>
              <Btn variant="warning" size="sm" T={T}>upgrade plan</Btn>
            </div>
          </div>

          {/* Usage */}
          <Section title="Usage This Period" T={T}>
            <UsageBar label="secrets" used={247} total={1000} unit="secrets" T={T} />
            <UsageBar label="seats" used={14} total={25} unit="members" T={T} />
            <UsageBar label="projects" used={12} total={50} unit="projects" T={T} />
            <UsageBar label="api calls" used={89000} total={500000} unit="calls/mo" T={T} />
          </Section>

          {/* Invoice history */}
          <Section title="Invoice History" T={T}>
            {[
              { date: "May 1, 2026", amount: "$99.00", status: "paid" },
              { date: "Apr 1, 2026", amount: "$99.00", status: "paid" },
              { date: "Mar 1, 2026", amount: "$29.00", status: "paid" },
            ].map(inv => (
              <div key={inv.date} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 0", borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{ fontFamily: FONTS.display, fontSize: "12px", color: T.textSecondary }}>{inv.date}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }}>{inv.amount}</span>
                  <Badge variant="success" T={T}>{inv.status}</Badge>
                  <button style={{ background: "none", border: "none", cursor: "pointer",
                    fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted }}>↓ pdf</button>
                </div>
              </div>
            ))}
          </Section>
        </div>
      )}

      {/* ── AUDIT tab ── */}
      {tab === "audit" && (
        <Section title="Audit Log" description="Last 30 days of activity" T={T}>
          <div style={{ marginBottom: "16px" }}>
            <Input placeholder="filter by user, action, or resource…" T={T} />
          </div>
          <AuditRow actor="Simone Russo" action="push" target="DATABASE_URL → production" time="2m ago" T={T} />
          <AuditRow actor="Laura Bianchi" action="rotate" target="JWT_SECRET → staging" time="1h ago" T={T} />
          <AuditRow actor="CI/CD Token" action="pull" target="all secrets → production" time="2h ago" T={T} />
          <AuditRow actor="Simone Russo" action="invite" target="newdev@acme.io → member" time="2d ago" T={T} />
          <AuditRow actor="Marco Verdi" action="delete" target="OLD_API_KEY → staging" time="3d ago" T={T} />
          <AuditRow actor="Laura Bianchi" action="revoke" target="token github-actions-old" time="5d ago" T={T} />
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Btn variant="secondary" size="sm" T={T}>load more</Btn>
          </div>
        </Section>
      )}

      {/* ── SETTINGS tab ── */}
      {tab === "settings" && (
        <div>
          <Section title="Organization Details" T={T}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <Input label="Org Name" value="Acme Corp" T={T} />
              <Input label="Slug" value="acme-corp" T={T} hint="Used in CLI: mull use acme-corp" />
              <Input label="Domain" value="acme.io" T={T} hint="Enables SSO auto-provisioning" />
              <Input label="Default environment" value="development" T={T} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn variant="primary" size="sm" T={T}>save changes</Btn>
            </div>
          </Section>

          <Section title="SSO Auto-provisioning" description="Users with @acme.io email auto-join this org on first login" T={T}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Google Workspace SSO", value: "acme.io domain verified", active: true },
                { label: "GitHub Org SSO", value: "acme-corp org — not configured", active: false },
                { label: "SAML SSO", value: "Available on Growth plan", active: false, locked: true },
              ].map(row => (
                <div key={row.label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", background: T.overlay, border: `1px solid ${T.border}`, borderRadius: "4px",
                }}>
                  <div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: row.locked ? T.textMuted : T.textPrimary, marginBottom: "2px" }}>{row.label}</div>
                    <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>{row.value}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {row.active && <Badge variant="success" pulse T={T}>active</Badge>}
                    {row.locked
                      ? <Badge T={T}>upgrade</Badge>
                      : <Btn variant={row.active ? "secondary" : "primary"} size="sm" T={T}>{row.active ? "manage" : "configure"}</Btn>
                    }
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Danger Zone" description="Irreversible actions for this organization" T={T} danger>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary, marginBottom: "2px" }}>Transfer ownership</div>
                  <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>Transfer this org to another member</div>
                </div>
                <Btn variant="warning" size="sm" T={T}>transfer</Btn>
              </div>
              <Divider T={T} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary, marginBottom: "2px" }}>Delete organization</div>
                  <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>Permanently deletes all projects, secrets, and members</div>
                </div>
                <Btn variant="danger" size="sm" T={T}>delete org</Btn>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════

export default function ProfileOrgStudy() {
  const [mode, setMode] = useState("dark");
  const [view, setView] = useState("profile");
  const T = THEMES[mode];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select { color-scheme: ${mode}; }
        ::placeholder { color: ${T.textDisabled}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Topbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 28px", height: "48px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "15px", color: T.textPrimary }}>mull</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted }}>
          / {view === "profile" ? "profile" : "acme-corp / settings"}
        </span>
        <div style={{ flex: 1 }} />

        {/* View switcher */}
        <div style={{ display: "flex", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>
          {[["profile", "◈ profile"], ["org", "▣ organization"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? T.surface : "transparent",
              border: "none", borderRight: v === "profile" ? `1px solid ${T.border}` : "none",
              cursor: "pointer", fontFamily: FONTS.mono, fontSize: "11px",
              color: view === v ? T.textPrimary : T.textMuted,
              padding: "6px 14px", transition: "all 0.12s",
            }}>{label}</button>
          ))}
        </div>

        <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")}
          style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: "4px",
            cursor: "pointer", fontFamily: FONTS.mono, fontSize: "11px",
            color: T.textSecondary, padding: "5px 12px" }}>
          {mode === "dark" ? "☀ light" : "● dark"}
        </button>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 48px)" }}>
        {/* Sidebar */}
        <div style={{
          width: "220px", flexShrink: 0,
          background: T.surface, borderRight: `1px solid ${T.border}`,
          padding: "20px 12px",
        }}>
          {/* User mini */}
          <div style={{ padding: "10px", marginBottom: "16px", borderBottom: `1px solid ${T.border}`, paddingBottom: "16px" }}>
            <Avatar name="Simone Russo" size={32} role="simone@acme.io" T={T} />
          </div>

          <div style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px 8px" }}>Account</div>
          {[
            { id: "profile", icon: "◈", label: "profile" },
            { id: "security", icon: "◇", label: "security" },
            { id: "tokens", icon: "▷", label: "personal tokens" },
          ].map(item => (
            <div key={item.id} onClick={() => { setView("profile"); }}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px",
                borderRadius: "4px", cursor: "pointer",
                background: view === "profile" && item.id === "profile" ? T.elevated : "transparent",
                fontFamily: FONTS.mono, fontSize: "12px",
                color: view === "profile" && item.id === "profile" ? T.textPrimary : T.textMuted,
                transition: "all 0.1s",
              }}>
              <span style={{ opacity: 0.6 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", padding: "16px 10px 8px" }}>Organization</div>
          {[
            { id: "org", icon: "▣", label: "acme-corp" },
          ].map(item => (
            <div key={item.id} onClick={() => setView("org")}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px",
                borderRadius: "4px", cursor: "pointer",
                background: view === "org" ? T.elevated : "transparent",
                fontFamily: FONTS.mono, fontSize: "12px",
                color: view === "org" ? T.textPrimary : T.textMuted,
                transition: "all 0.1s",
              }}>
              <span style={{ opacity: 0.6 }}>{item.icon}</span>
              {item.label}
              {view === "org" && <span style={{ marginLeft: "auto", fontFamily: FONTS.mono, fontSize: "9px",
                color: T.termGreen, background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
                padding: "1px 5px", borderRadius: "2px" }}>owner</span>}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: "32px 36px", maxWidth: "800px", animation: "fadeUp 0.2s ease" }} key={view}>
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.15em", marginBottom: "6px" }}>
              {view === "profile" ? "▣ user / profile" : "▣ acme-corp / settings"}
            </div>
            <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "24px", color: T.textPrimary, letterSpacing: "-0.02em" }}>
              {view === "profile" ? "Your Profile" : "Organization Settings"}
            </h1>
          </div>

          {view === "profile" ? <ProfilePage T={T} /> : <OrgPage T={T} />}
        </div>
      </div>
    </div>
  );
}
