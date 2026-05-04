import { useState } from 'react';
import { FONTS } from '../tokens.js';

function ActionBtn({ label, hoverColor, T, onClick }) {
  const [h, setH] = useState(false);
  const icons = { edit: "✎", del: "⌫" };
  return (
    <button
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={e => { e.stopPropagation(); onClick?.(); }}
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

function TreeNode({ node, T, onEdit, onDelete, onSelect, selectedId }) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  const hasChildren = node.children?.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      {/* Row */}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => onSelect?.(node)}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 12px", borderRadius: "5px",
          background: isSelected ? T.elevated : hover ? T.overlay : "transparent",
          borderLeft: isSelected ? `2px solid ${T.termGreen}` : "2px solid transparent",
          cursor: onSelect ? "pointer" : "default", transition: "background 0.12s",
        }}
      >
        {/* Toggle */}
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o); onSelect?.(node); }}
            style={{
              width: "16px", height: "16px", flexShrink: 0,
              background: T.elevated, border: `1px solid ${T.border}`,
              borderRadius: "3px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FONTS.mono, fontSize: "10px", color: T.textMuted,
              transition: "all 0.1s",
            }}
          >
            {open ? "−" : "+"}
          </button>
        ) : (
          <div style={{
            width: "16px", height: "16px", flexShrink: 0,
            border: `1px solid ${T.border}`, borderRadius: "3px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONTS.mono, fontSize: "9px", color: T.textMuted,
          }}>≡</div>
        )}

        {/* Icon */}
        <span style={{ fontFamily: FONTS.mono, fontSize: "13px", color: T.termGreen, opacity: 0.7 }}>
          {node.icon}
        </span>

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: "13px", color: T.textPrimary }}>
            {node.name}
          </div>
          {node.description && (
            <div style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginTop: "1px" }}>
              {node.description}
            </div>
          )}
        </div>

        {/* Hover actions */}
        {hover && (
          <div style={{ display: "flex", gap: "6px" }}>
            {onEdit   && <ActionBtn label="edit" hoverColor={T.textSecondary} T={T} onClick={() => onEdit(node)} />}
            {onDelete && <ActionBtn label="del"  hoverColor={T.red}           T={T} onClick={() => onDelete(node)} />}
          </div>
        )}
      </div>

      {/* Children — single continuous borderLeft, no absolute positioning */}
      {open && hasChildren && (
        <div style={{
          marginLeft: "19px",          /* align with center of the toggle button */
          paddingLeft: "19px",
          borderLeft: `1px solid ${T.border}`,
        }}>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} T={T} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppTreeA({ nodes, T, onEdit, onDelete, onSelect, selectedId }) {
  return (
    <div style={{ padding: "6px 8px" }}>
      {nodes.map(node => (
        <TreeNode key={node.id} node={node} T={T} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}
