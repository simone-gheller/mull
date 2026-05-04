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

const FONTS = {
  display: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ── Sample tree data ───────────────────────────────────────
const TREE = [
  {
    id: "root", name: "acme-corp", description: "root org config", icon: "▣",
    children: [
      {
        id: "data", name: "common-data", description: "config common across the data layer", icon: "◈",
        children: [
          { id: "pg", name: "postgresql", description: "database server config", icon: "◇", children: [] },
          { id: "redis", name: "redis", description: "cache server config", icon: "◇", children: [] },
        ],
      },
      {
        id: "services", name: "common-service", description: "config common to all services", icon: "◈",
        children: [
          { id: "backend", name: "backend", description: "main API service config", icon: "◇", children: [] },
          { id: "auth", name: "auth", description: "authentication service config", icon: "◇", children: [] },
          { id: "worker", name: "worker", description: "background job processor", icon: "◇", children: [] },
        ],
      },
      {
        id: "web", name: "web", description: "frontend application config", icon: "◈",
        children: [
          { id: "app", name: "app", description: "main dashboard app", icon: "◇", children: [] },
          { id: "marketing", name: "marketing", description: "public landing page", icon: "◇", children: [] },
        ],
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════
//  VARIANT A — Indented tree with connector lines
//  Clean, classic tree. Lines drawn with borders.
// ══════════════════════════════════════════════════════════

function TreeNodeA({ node, depth = 0, isLast = true, parentLines = [], T }) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  const hasChildren = node.children?.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* Vertical guide lines for parent levels */}
        {parentLines.map((show, i) => (
          <div key={i} style={{
            width: "32px", flexShrink: 0,
            borderRight: show ? `1px solid ${T.border}` : "none",
          }} />
        ))}

        {/* Connector for current level */}
        {depth > 0 && (
          <div style={{ width: "32px", flexShrink: 0, position: "relative" }}>
            <div style={{
              position: "absolute", top: 0, bottom: isLast ? "50%" : 0,
              left: 0, borderRight: `1px solid ${T.border}`,
            }} />
            <div style={{
              position: "absolute", top: "50%", left: 0,
              width: "100%", borderBottom: `1px solid ${T.border}`,
            }} />
          </div>
        )}

        {/* Node row */}
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 14px",
            margin: "2px 0",
            background: hover ? T.overlay : T.surface,
            border: `1px solid ${hover ? T.borderHover : T.border}`,
            borderRadius: "5px",
            cursor: "pointer",
            transition: "all 0.12s",
          }}
        >
          {/* Expand toggle */}
          {hasChildren ? (
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                width: "18px", height: "18px", flexShrink: 0,
                background: T.elevated, border: `1px solid ${T.border}`,
                borderRadius: "3px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONTS.mono, fontSize: "10px",
                color: T.textMuted, transition: "all 0.1s",
              }}
            >
              {open ? "−" : "+"}
            </button>
          ) : (
            <div style={{ width: "18px", height: "18px", flexShrink: 0,
              border: `1px solid ${T.border}`, borderRadius: "3px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted,
            }}>≡</div>
          )}

          {/* Icon */}
          <span style={{ fontFamily: FONTS.mono, fontSize: "13px", color: T.termGreen, opacity: 0.7 }}>
            {node.icon}
          </span>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: "13px", color: T.textPrimary }}>
              {node.name}
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginTop: "1px" }}>
              {node.description}
            </div>
          </div>

          {/* Actions */}
          {hover && (
            <div style={{ display: "flex", gap: "6px" }}>
              <ActionBtn label="edit" color={T.textMuted} hoverColor={T.textSecondary} T={T} />
              <ActionBtn label="delete" color={T.textMuted} hoverColor={T.red} T={T} />
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <TreeNodeA
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
              parentLines={[
                ...parentLines,
                depth > 0 ? !isLast : false,
              ]}
              T={T}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  VARIANT B — Filesystem / path style
//  Breadcrumb-inspired. Each level indented with a path glyph.
//  Compact, very terminal-like.
// ══════════════════════════════════════════════════════════

function TreeNodeB({ node, depth = 0, path = [], T }) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  const hasChildren = node.children?.length > 0;
  const currentPath = [...path, node.name];
  const indent = depth * 20;

  return (
    <div>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", alignItems: "center", gap: "0",
          padding: "7px 12px 7px 0",
          paddingLeft: `${indent + 12}px`,
          borderBottom: `1px solid ${T.border}`,
          background: hover ? T.overlay : "transparent",
          transition: "background 0.1s",
          cursor: "pointer",
          fontFamily: FONTS.mono,
        }}
      >
        {/* Depth prefix glyphs */}
        {depth > 0 && (
          <span style={{ color: T.textMuted, marginRight: "8px", fontSize: "12px" }}>
            {"└─"}
          </span>
        )}

        {/* Toggle */}
        {hasChildren && (
          <span
            onClick={() => setOpen(o => !o)}
            style={{
              color: T.termGreen, marginRight: "8px", fontSize: "11px",
              opacity: 0.8, userSelect: "none",
            }}
          >
            {open ? "▾" : "▸"}
          </span>
        )}
        {!hasChildren && (
          <span style={{ color: T.textMuted, marginRight: "8px", fontSize: "11px" }}>◇</span>
        )}

        {/* Path */}
        <span style={{ fontSize: "12px" }}>
          {path.map((seg, i) => (
            <span key={i} style={{ color: T.textMuted }}>{seg}/</span>
          ))}
          <span style={{ color: depth === 0 ? T.termGreen : T.textPrimary, fontWeight: depth === 0 ? 500 : 400 }}>
            {node.name}
          </span>
        </span>

        <span style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginLeft: "16px" }}>
          {node.description}
        </span>

        <div style={{ flex: 1 }} />

        {hover && (
          <div style={{ display: "flex", gap: "6px", marginRight: "4px" }}>
            <ActionBtn label="edit" color={T.textMuted} hoverColor={T.textSecondary} T={T} />
            <ActionBtn label="del" color={T.textMuted} hoverColor={T.red} T={T} />
          </div>
        )}
      </div>

      {open && hasChildren && node.children.map(child => (
        <TreeNodeB key={child.id} node={child} depth={depth + 1} path={currentPath} T={T} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  VARIANT C — Card grid with nested expansion
//  Visual, spacious. Root = wide card, children = inline chips.
//  Good for dashboards and overview pages.
// ══════════════════════════════════════════════════════════

function TreeNodeC({ node, depth = 0, T }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children?.length > 0;

  if (depth === 0) {
    return (
      <div>
        {node.children?.map(child => (
          <TreeNodeC key={child.id} node={child} depth={1} T={T} />
        ))}
      </div>
    );
  }

  if (depth === 1) {
    return (
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: "6px", marginBottom: "12px", overflow: "hidden",
      }}>
        {/* Group header */}
        <div
          onClick={() => {}}
          style={{
            padding: "12px 16px",
            borderBottom: open && hasChildren ? `1px solid ${T.border}` : "none",
            display: "flex", alignItems: "center", gap: "10px",
            background: T.overlay,
          }}
        >
          <span style={{
            width: "3px", height: "14px",
            background: T.termGreen, borderRadius: "2px",
            boxShadow: `0 0 5px ${T.termGreen}`,
          }} />
          <span style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }}>{node.name}</span>
          <span style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>{node.description}</span>
          <div style={{ flex: 1 }} />
          {hasChildren && (
            <span style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`, padding: "1px 7px", borderRadius: "2px" }}>
              {node.children.length} apps
            </span>
          )}
          <div style={{ display: "flex", gap: "6px", marginLeft: "10px" }}>
            <ActionBtn label="edit" color={T.textMuted} hoverColor={T.textSecondary} T={T} />
            <ActionBtn label="del" color={T.textMuted} hoverColor={T.red} T={T} />
          </div>
        </div>

        {/* Children as rows */}
        {open && hasChildren && (
          <div>
            {node.children.map((child, i) => (
              <ChildRowC
                key={child.id} node={child} T={T}
                isLast={i === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function ChildRowC({ node, isLast, T }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "9px 16px 9px 28px",
        borderBottom: !isLast ? `1px solid ${T.border}` : "none",
        background: hover ? T.overlay : "transparent",
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: T.textMuted }}>└</span>
      <span style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textSecondary }}>{node.icon}</span>
      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }}>{node.name}</span>
        <span style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginLeft: "12px" }}>{node.description}</span>
      </div>
      {hover && (
        <div style={{ display: "flex", gap: "6px" }}>
          <ActionBtn label="edit" color={T.textMuted} hoverColor={T.textSecondary} T={T} />
          <ActionBtn label="del" color={T.textMuted} hoverColor={T.red} T={T} />
        </div>
      )}
    </div>
  );
}

// ── Shared action button ───────────────────────────────────
function ActionBtn({ label, color, hoverColor, T }) {
  const [h, setH] = useState(false);
  const icons = { edit: "✎", delete: "⌫", del: "⌫" };
  return (
    <button
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: FONTS.mono, fontSize: "11px",
        color: h ? hoverColor : color,
        padding: "2px 6px", borderRadius: "3px",
        background: h ? T.elevated : "transparent",
        transition: "all 0.1s",
      }}
    >
      {icons[label] || label}
    </button>
  );
}

// ── Section label ──────────────────────────────────────────
function SLabel({ children, T }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px",
      fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted,
      letterSpacing: "0.12em", textTransform: "uppercase",
    }}>
      <span style={{ color: T.termGreen }}>//</span>
      {children}
      <span style={{ flex: 1, height: "1px", background: T.border }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════

export default function AppHierarchy() {
  const [mode, setMode] = useState("dark");
  const T = THEMES[mode];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Topbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 28px", height: "48px",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "15px", color: T.textPrimary }}>mull</div>
        <span style={{ fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted }}>/ apps / hierarchy</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")}
          style={{
            background: T.elevated, border: `1px solid ${T.border}`, borderRadius: "4px",
            cursor: "pointer", fontFamily: FONTS.mono, fontSize: "11px",
            color: T.textSecondary, padding: "5px 12px",
          }}>
          {mode === "dark" ? "☀ light" : "● dark"}
        </button>
      </div>

      <div style={{ padding: "36px 28px", maxWidth: "860px", margin: "0 auto", animation: "fadeUp 0.25s ease" }}>

        {/* Header */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen, letterSpacing: "0.15em", marginBottom: "8px" }}>
            ▣ acme-corp / apps
          </div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: "28px", fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em", marginBottom: "6px" }}>
            App Hierarchy
          </h1>
          <p style={{ fontFamily: FONTS.display, fontSize: "14px", color: T.textSecondary }}>
            Organize config inheritance across your services and environments.
          </p>
        </div>

        {/* VARIANT A */}
        <div style={{ marginBottom: "52px" }}>
          <SLabel T={T}>Variant A — indented tree with connector lines</SLabel>
          <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, marginBottom: "16px" }}>
            // Classic tree. Good for deep hierarchies. Collapse/expand per nodo.
          </div>
          <div style={{ padding: "16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px" }}>
            {TREE.map(node => (
              <TreeNodeA key={node.id} node={node} T={T} />
            ))}
          </div>
        </div>

        {/* VARIANT B */}
        <div style={{ marginBottom: "52px" }}>
          <SLabel T={T}>Variant B — filesystem path style</SLabel>
          <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, marginBottom: "16px" }}>
            // Terminal-native. Breadcrumb path prefix per ogni nodo.
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px", overflow: "hidden" }}>
            {TREE.map(node => (
              <TreeNodeB key={node.id} node={node} T={T} />
            ))}
          </div>
        </div>

        {/* VARIANT C */}
        <div style={{ marginBottom: "52px" }}>
          <SLabel T={T}>Variant C — grouped cards</SLabel>
          <div style={{ fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted, marginBottom: "16px" }}>
            // Visivo e spazioso. Ideale per dashboard overview. Gruppi come card.
          </div>
          {TREE.map(node => (
            <TreeNodeC key={node.id} node={node} T={T} />
          ))}
        </div>

      </div>
    </div>
  );
}
