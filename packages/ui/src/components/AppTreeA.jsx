import { useState, useRef } from 'react';
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

function TreeNode({ node, T, onEdit, onDelete, onSelect, selectedId, defaultFocusable }) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  const hasChildren = node.children?.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? open : undefined}
      aria-selected={isSelected}
    >
      {/* Row */}
      <div
        data-treerow
        tabIndex={isSelected || defaultFocusable ? 0 : -1}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => onSelect?.(node)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(node); }
          if (e.key === 'ArrowRight' && hasChildren && !open) { e.preventDefault(); setOpen(true); }
          if (e.key === 'ArrowLeft' && hasChildren && open) { e.preventDefault(); setOpen(false); }
        }}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 12px", borderRadius: "0 5px 5px 0",
          background: isSelected ? "rgba(45, 216, 129, 0.08)" : hover ? T.overlay : "transparent",
          borderLeft: `2px solid ${isSelected ? T.termGreen : "transparent"}`,
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
              color: T.textMuted,
            }}
          >
            <span style={{
              display: "inline-block", fontSize: "7px", lineHeight: 1,
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease-out",
            }}>▶</span>
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

      {/* Children — grid-template-rows transition for smooth expand/collapse */}
      {hasChildren && (
        <div role="group" style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.15s ease-out",
          marginLeft: "19px",
          paddingLeft: "19px",
          borderLeft: `1px solid ${T.border}`,
        }}>
          <div style={{ overflow: "hidden" }}>
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} T={T} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} selectedId={selectedId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppTreeA({ nodes, T, onEdit, onDelete, onSelect, selectedId }) {
  const treeRef = useRef(null);

  const handleKeyDown = (e) => {
    if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const items = [...treeRef.current.querySelectorAll('[data-treerow]')];
    const idx = items.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? items[idx + 1] : items[idx - 1];
    if (next) {
      items[idx].tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
  };

  return (
    <div role="tree" ref={treeRef} onKeyDown={handleKeyDown} style={{ padding: "6px 8px" }}>
      {nodes.map((node, i) => (
        <TreeNode key={node.id} node={node} T={T} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} selectedId={selectedId} defaultFocusable={!selectedId && i === 0} />
      ))}
    </div>
  );
}
