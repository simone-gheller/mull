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

function ChildRow({ node, isLast, T, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);

  return (
    <div>
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
          {node.description && (
            <span style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted, marginLeft: "12px" }}>
              {node.description}
            </span>
          )}
        </div>
        {node.children?.length > 0 && (
          <span style={{
            fontFamily: FONTS.mono, fontSize: "9px", color: T.termGreen,
            background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
            padding: "1px 6px", borderRadius: "2px",
          }}>
            {node.children.length} children
          </span>
        )}
        {hover && (
          <div style={{ display: "flex", gap: "6px" }}>
            {onEdit && <ActionBtn label="edit" hoverColor={T.textSecondary} T={T} onClick={() => onEdit(node)} />}
            {onDelete && <ActionBtn label="del" hoverColor={T.red} T={T} onClick={() => onDelete(node)} />}
          </div>
        )}
      </div>

      {node.children?.length > 0 && node.children.map((child, i) => (
        <div key={child.id} style={{ paddingLeft: "16px" }}>
          <ChildRow node={child} isLast={i === node.children.length - 1} T={T} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

function GroupCard({ node, T, onEdit, onDelete }) {
  const hasChildren = node.children?.length > 0;
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: "6px", marginBottom: "12px", overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: hasChildren ? `1px solid ${T.border}` : "none",
        display: "flex", alignItems: "center", gap: "10px",
        background: T.overlay,
      }}>
        <span style={{
          width: "3px", height: "14px",
          background: T.termGreen, borderRadius: "2px",
          boxShadow: `0 0 5px ${T.termGreen}`, flexShrink: 0,
        }} />
        <span style={{ fontFamily: FONTS.mono, fontSize: "12px", color: T.textPrimary }}>{node.name}</span>
        {node.description && (
          <span style={{ fontFamily: FONTS.display, fontSize: "11px", color: T.textMuted }}>{node.description}</span>
        )}
        <div style={{ flex: 1 }} />
        {hasChildren && (
          <span style={{
            fontFamily: FONTS.mono, fontSize: "10px", color: T.termGreen,
            background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
            padding: "1px 7px", borderRadius: "2px",
          }}>
            {node.children.length} apps
          </span>
        )}
        <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
          {onEdit && <ActionBtn label="edit" hoverColor={T.textSecondary} T={T} onClick={() => onEdit(node)} />}
          {onDelete && <ActionBtn label="del" hoverColor={T.red} T={T} onClick={() => onDelete(node)} />}
        </div>
      </div>

      {hasChildren && node.children.map((child, i) => (
        <ChildRow
          key={child.id}
          node={child}
          isLast={i === node.children.length - 1}
          T={T}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export function AppTreeC({ nodes, T, onEdit, onDelete }) {
  if (nodes.length === 0) return null;

  const hasRealRoot = nodes.length === 1 && nodes[0].children?.length > 0;
  const groups = hasRealRoot ? nodes[0].children : nodes;

  return (
    <div>
      {groups.map(node => (
        <GroupCard key={node.id} node={node} T={T} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
