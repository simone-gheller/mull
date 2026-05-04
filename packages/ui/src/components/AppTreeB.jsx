import { useState } from 'react';
import { FONTS } from '../tokens.js';

function ActionBtn({ label, hoverColor, T }) {
  const [h, setH] = useState(false);
  const icons = { edit: "✎", del: "⌫" };
  return (
    <button
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: h ? T.elevated : "none", border: "none", cursor: "pointer",
        fontFamily: FONTS.mono, fontSize: "11px",
        color: h ? hoverColor : T.textMuted,
        padding: "2px 6px", borderRadius: "3px", transition: "all 0.1s",
      }}
    >
      {icons[label] ?? label}
    </button>
  );
}

function TreeNodeB({ node, depth = 0, path = [], T, onEdit, onDelete }) {
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
          display: "flex", alignItems: "center",
          padding: `7px 12px 7px ${indent + 12}px`,
          borderBottom: `1px solid ${T.border}`,
          background: hover ? T.overlay : "transparent",
          transition: "background 0.1s", cursor: "pointer",
          fontFamily: FONTS.mono,
        }}
      >
        {depth > 0 && (
          <span style={{ color: T.textMuted, marginRight: "8px", fontSize: "12px" }}>└─</span>
        )}

        {hasChildren ? (
          <span
            onClick={() => setOpen(o => !o)}
            style={{ color: T.termGreen, marginRight: "8px", fontSize: "11px", opacity: 0.8, userSelect: "none" }}
          >
            {open ? "▾" : "▸"}
          </span>
        ) : (
          <span style={{ color: T.textMuted, marginRight: "8px", fontSize: "11px" }}>◇</span>
        )}

        <span style={{ fontSize: "12px" }}>
          {path.map((seg, i) => (
            <span key={i} style={{ color: T.textMuted }}>{seg}/</span>
          ))}
          <span style={{ color: depth === 0 ? T.termGreen : T.textPrimary, fontWeight: depth === 0 ? 500 : 400 }}>
            {node.name}
          </span>
        </span>

        {node.description && (
          <span style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginLeft: "16px" }}>
            {node.description}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {hover && (
          <div style={{ display: "flex", gap: "6px", marginRight: "4px" }}>
            {onEdit && <ActionBtn label="edit" hoverColor={T.textSecondary} T={T} onClick={() => onEdit(node)} />}
            {onDelete && <ActionBtn label="del" hoverColor={T.red} T={T} onClick={() => onDelete(node)} />}
          </div>
        )}
      </div>

      {open && hasChildren && node.children.map(child => (
        <TreeNodeB key={child.id} node={child} depth={depth + 1} path={currentPath} T={T} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function AppTreeB({ nodes, T, onEdit, onDelete }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px", overflow: "hidden" }}>
      {nodes.map(node => (
        <TreeNodeB key={node.id} node={node} T={T} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
